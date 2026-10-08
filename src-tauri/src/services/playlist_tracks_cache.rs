use std::collections::HashMap;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::{Duration, Instant};

use crate::services::playlist::TrackInfo;

const TTL: Duration = Duration::from_secs(10 * 60);

struct Entry {
    fetched_at: Instant,
    tracks: Vec<TrackInfo>,
}

#[derive(Default)]
pub struct PlaylistTracksCache {
    entries: Mutex<HashMap<u64, Entry>>,
    fetch_locks: Mutex<HashMap<u64, Arc<tokio::sync::Mutex<()>>>>,
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

impl PlaylistTracksCache {
    pub fn get(&self, playlist_id: u64) -> Option<Vec<TrackInfo>> {
        let mut entries = lock(&self.entries);
        let entry = entries.get(&playlist_id)?;
        if entry.fetched_at.elapsed() < TTL {
            return Some(entry.tracks.clone());
        }
        entries.remove(&playlist_id);
        None
    }

    pub fn set(&self, playlist_id: u64, tracks: Vec<TrackInfo>) {
        let mut entries = lock(&self.entries);
        entries.insert(playlist_id, Entry { fetched_at: Instant::now(), tracks });
    }

    /// Serializes fetches of the same playlist so a prefetch and an open share one SoundCloud round-trip.
    pub fn fetch_lock(&self, playlist_id: u64) -> Arc<tokio::sync::Mutex<()>> {
        let mut locks = lock(&self.fetch_locks);
        locks.entry(playlist_id).or_default().clone()
    }

    pub fn release_fetch_lock(&self, playlist_id: u64) {
        lock(&self.fetch_locks).remove(&playlist_id);
    }

    pub fn invalidate(&self, playlist_id: u64) {
        lock(&self.entries).remove(&playlist_id);
    }

    pub fn clear(&self) {
        lock(&self.entries).clear();
        lock(&self.fetch_locks).clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    type TestResult<T = ()> = Result<T, Box<dyn std::error::Error>>;

    fn track(id: u64) -> TestResult<TrackInfo> {
        let raw: crate::services::playlist::RawTrackInfo = serde_json::from_value(serde_json::json!({
            "id": id,
            "title": "t",
            "user": { "id": 1, "username": "u" },
            "artwork_url": null,
            "duration": 1000
        }))?;
        Ok(TrackInfo::from(raw))
    }

    #[test]
    fn returns_stored_tracks() -> TestResult {
        let cache = PlaylistTracksCache::default();
        cache.set(1, vec![track(10)?, track(11)?]);
        assert_eq!(cache.get(1).map(|tracks| tracks.iter().map(|t| t.id).collect::<Vec<_>>()), Some(vec![10, 11]));
        assert!(cache.get(2).is_none());
        Ok(())
    }

    #[test]
    fn expired_entries_are_evicted_on_read() -> TestResult {
        let cache = PlaylistTracksCache::default();
        let stale = Instant::now().checked_sub(TTL).ok_or("clock too close to boot")?;
        lock(&cache.entries).insert(1, Entry { fetched_at: stale, tracks: vec![track(10)?] });
        assert!(cache.get(1).is_none());
        assert!(!lock(&cache.entries).contains_key(&1));
        Ok(())
    }

    #[test]
    fn invalidate_and_clear_drop_entries() -> TestResult {
        let cache = PlaylistTracksCache::default();
        cache.set(1, vec![track(10)?]);
        cache.set(2, vec![track(20)?]);
        cache.invalidate(1);
        assert!(cache.get(1).is_none());
        assert!(cache.get(2).is_some());
        cache.clear();
        assert!(cache.get(2).is_none());
        Ok(())
    }

    #[test]
    fn fetch_lock_is_shared_per_playlist() {
        let cache = PlaylistTracksCache::default();
        assert!(Arc::ptr_eq(&cache.fetch_lock(1), &cache.fetch_lock(1)));
        assert!(!Arc::ptr_eq(&cache.fetch_lock(1), &cache.fetch_lock(2)));
    }

    #[test]
    fn released_and_cleared_fetch_locks_are_dropped() {
        let cache = PlaylistTracksCache::default();
        let first = cache.fetch_lock(1);
        cache.release_fetch_lock(1);
        assert!(!Arc::ptr_eq(&first, &cache.fetch_lock(1)));
        let second = cache.fetch_lock(1);
        cache.clear();
        assert!(!Arc::ptr_eq(&second, &cache.fetch_lock(1)));
    }
}
