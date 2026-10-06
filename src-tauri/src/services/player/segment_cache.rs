use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::{Arc, Mutex, MutexGuard};

use super::playlist::MediaPlaylist;

pub const MAX_CACHE_BYTES: usize = 64 * 1024 * 1024;
pub const MAX_METADATA_ENTRIES: usize = 256;

#[derive(Default)]
struct CacheInner {
    blobs: HashMap<String, Arc<Vec<u8>>>,
    order: VecDeque<String>,
    total_bytes: usize,
    playlists: HashMap<String, Arc<MediaPlaylist>>,
    keys: HashMap<String, [u8; 16]>,
    lengths: HashMap<String, u64>,
    metadata_order: VecDeque<String>,
    owners: HashMap<u64, HashSet<String>>,
}

impl CacheInner {
    fn own(&mut self, owner: Option<u64>, key: &str) {
        if let Some(id) = owner {
            self.owners.entry(id).or_default().insert(key.to_string());
        }
    }

    fn track_metadata(&mut self, key: &str) {
        if !self.metadata_order.iter().any(|k| k == key) {
            self.metadata_order.push_back(key.to_string());
        }
        while self.metadata_order.len() > MAX_METADATA_ENTRIES {
            let Some(oldest) = self.metadata_order.pop_front() else {
                break;
            };
            self.playlists.remove(&oldest);
            self.keys.remove(&oldest);
            self.lengths.remove(&oldest);
            log::debug!("[player::segment_cache] Evicted metadata entry (cap {})", MAX_METADATA_ENTRIES);
        }
    }

    fn evict(&mut self, max_bytes: usize) {
        while self.total_bytes > max_bytes {
            let Some(key) = self.order.pop_front() else {
                break;
            };
            if let Some(bytes) = self.blobs.remove(&key) {
                self.total_bytes = self.total_bytes.saturating_sub(bytes.len());
                log::debug!("[player::segment_cache] Evicted {} bytes (total now {}, cap {})", bytes.len(), self.total_bytes, max_bytes);
            }
        }
    }

    fn remove_key(&mut self, key: &str) {
        if let Some(bytes) = self.blobs.remove(key) {
            self.total_bytes = self.total_bytes.saturating_sub(bytes.len());
            self.order.retain(|k| k != key);
        }
        self.playlists.remove(key);
        self.keys.remove(key);
        self.lengths.remove(key);
        self.metadata_order.retain(|k| k != key);
    }
}

pub struct SegmentCache {
    inner: Mutex<CacheInner>,
    max_bytes: usize,
}

impl Default for SegmentCache {
    fn default() -> Self {
        Self::new(MAX_CACHE_BYTES)
    }
}

impl SegmentCache {
    pub fn new(max_bytes: usize) -> Self {
        Self { inner: Mutex::new(CacheInner::default()), max_bytes }
    }

    pub fn chunk_key(url: &str, index: u64) -> String {
        format!("{url}#chunk={index}")
    }

    fn lock(&self) -> MutexGuard<'_, CacheInner> {
        self.inner.lock().unwrap_or_else(|p| p.into_inner())
    }

    pub fn get_blob(&self, key: &str) -> Option<Arc<Vec<u8>>> {
        let hit = self.lock().blobs.get(key).cloned();
        log::trace!("[player::segment_cache] get_blob key_len={} hit={}", key.len(), hit.is_some());
        hit
    }

    pub fn put_blob(&self, owner: Option<u64>, key: String, bytes: Arc<Vec<u8>>) {
        let mut inner = self.lock();
        inner.own(owner, &key);
        if inner.blobs.contains_key(&key) {
            return;
        }
        log::debug!("[player::segment_cache] put_blob owner={:?} bytes={} total_before={}", owner, bytes.len(), inner.total_bytes);
        inner.total_bytes += bytes.len();
        inner.order.push_back(key.clone());
        inner.blobs.insert(key, bytes);
        inner.evict(self.max_bytes);
    }

    pub fn get_playlist(&self, url: &str) -> Option<Arc<MediaPlaylist>> {
        self.lock().playlists.get(url).cloned()
    }

    pub fn put_playlist(&self, owner: Option<u64>, url: String, playlist: Arc<MediaPlaylist>) {
        let mut inner = self.lock();
        inner.own(owner, &url);
        inner.track_metadata(&url);
        inner.playlists.insert(url, playlist);
    }

    pub fn get_key(&self, uri: &str) -> Option<[u8; 16]> {
        self.lock().keys.get(uri).copied()
    }

    pub fn put_key(&self, owner: Option<u64>, uri: String, key: [u8; 16]) {
        let mut inner = self.lock();
        inner.own(owner, &uri);
        inner.track_metadata(&uri);
        inner.keys.insert(uri, key);
    }

    pub fn get_length(&self, url: &str) -> Option<u64> {
        self.lock().lengths.get(url).copied()
    }

    pub fn put_length(&self, owner: Option<u64>, url: String, length: u64) {
        let mut inner = self.lock();
        inner.own(owner, &url);
        inner.track_metadata(&url);
        inner.lengths.insert(url, length);
    }

    #[cfg(test)]
    pub fn total_bytes(&self) -> usize {
        self.lock().total_bytes
    }

    pub fn purge(&self, keep: &HashSet<u64>) {
        let mut inner = self.lock();
        let dropped: Vec<u64> = inner.owners.keys().filter(|id| !keep.contains(id)).copied().collect();
        let still_owned: HashSet<String> = inner.owners.iter().filter(|(id, _)| keep.contains(id)).flat_map(|(_, keys)| keys.iter().cloned()).collect();
        for id in &dropped {
            let Some(keys) = inner.owners.remove(id) else {
                continue;
            };
            for key in keys.iter().filter(|k| !still_owned.contains(*k)) {
                inner.remove_key(key);
            }
        }
        log::debug!("[player::segment_cache] Purged {} track(s); kept {}; cache now {} bytes", dropped.len(), keep.len(), inner.total_bytes);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn blob(n: usize) -> Arc<Vec<u8>> {
        Arc::new(vec![0u8; n])
    }

    #[test]
    fn stores_and_returns_blobs() {
        let cache = SegmentCache::default();
        cache.put_blob(Some(1), "a".into(), blob(3));
        assert_eq!(cache.get_blob("a").unwrap().len(), 3);
        assert!(cache.get_blob("b").is_none());
        assert_eq!(cache.total_bytes(), 3);
    }

    #[test]
    fn evicts_oldest_beyond_capacity() {
        let cache = SegmentCache::new(10);
        cache.put_blob(None, "a".into(), blob(6));
        cache.put_blob(None, "b".into(), blob(6));
        assert!(cache.get_blob("a").is_none());
        assert!(cache.get_blob("b").is_some());
        assert_eq!(cache.total_bytes(), 6);
    }

    #[test]
    fn purge_drops_entries_of_tracks_not_kept() {
        let cache = SegmentCache::default();
        cache.put_blob(Some(1), "one".into(), blob(1));
        cache.put_blob(Some(2), "two".into(), blob(1));
        cache.put_blob(Some(2), "shared".into(), blob(1));
        cache.put_blob(Some(3), "shared".into(), blob(1));
        cache.put_key(Some(1), "key1".into(), [0u8; 16]);
        cache.put_length(Some(1), "prog".into(), 99);
        cache.put_blob(None, "unowned".into(), blob(1));
        cache.purge(&HashSet::from([2]));
        assert!(cache.get_blob("one").is_none());
        assert!(cache.get_key("key1").is_none());
        assert!(cache.get_length("prog").is_none());
        assert!(cache.get_blob("two").is_some());
        assert!(cache.get_blob("shared").is_some());
        assert!(cache.get_blob("unowned").is_some());
    }

    #[test]
    fn purge_with_empty_set_drops_all_owned() {
        let cache = SegmentCache::default();
        cache.put_blob(Some(1), "one".into(), blob(1));
        cache.purge(&HashSet::new());
        assert!(cache.get_blob("one").is_none());
        assert_eq!(cache.total_bytes(), 0);
    }

    #[test]
    fn metadata_is_bounded_fifo() {
        let cache = SegmentCache::default();
        for index in 0..=MAX_METADATA_ENTRIES {
            cache.put_length(None, format!("url-{index}"), index as u64);
        }
        assert!(cache.get_length("url-0").is_none());
        assert_eq!(cache.get_length("url-1"), Some(1));
        assert_eq!(cache.get_length(&format!("url-{MAX_METADATA_ENTRIES}")), Some(MAX_METADATA_ENTRIES as u64));
        cache.put_length(None, "url-1".into(), 1);
        assert_eq!(cache.get_length("url-1"), Some(1));
    }

    #[test]
    fn chunk_key_format() {
        assert_eq!(SegmentCache::chunk_key("https://x/a.mp3", 3), "https://x/a.mp3#chunk=3");
    }
}
