use std::collections::HashSet;
use std::sync::Arc;

use tokio::sync::Semaphore;

use super::fetch::{FetchFailure, PRELOAD_MAX_ATTEMPTS};
use super::head::{fetch_head, FetchContext, Head};
use super::hls::{fetch_init, fetch_part};
use super::messages::PlayerPreloadTrack;
use super::playlist::MediaPlaylist;
use super::ports::CancelScope;
use super::segment_cache::SegmentCache;
use super::url_prefix;

const MAX_CONCURRENT_PRELOADS: usize = 2;

fn preload_context(cache: Arc<SegmentCache>, track_id: u64) -> FetchContext {
    FetchContext { cache, scope: Arc::new(CancelScope::default()), owner: Some(track_id), reporter: Arc::new(|_| {}) }
}

pub fn spawn_preload_tracks(cache: Arc<SegmentCache>, tracks: Vec<PlayerPreloadTrack>) {
    if tracks.is_empty() {
        log::debug!("[player::preload] No tracks to preload");
        return;
    }
    log::info!("[player::preload] Preloading {} track head(s)", tracks.len());
    let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_PRELOADS));
    for track in tracks {
        let cache = cache.clone();
        let semaphore = semaphore.clone();
        tauri::async_runtime::spawn(async move {
            let Ok(_permit) = semaphore.acquire_owned().await else {
                log::warn!("[player::preload] Semaphore closed; skipping track {}", track.track_id);
                return;
            };
            preload_track_head(cache, track).await;
        });
    }
}

async fn preload_track_head(cache: Arc<SegmentCache>, track: PlayerPreloadTrack) {
    let ctx = preload_context(cache, track.track_id);
    let result = match fetch_head(&ctx, &track.url, PRELOAD_MAX_ATTEMPTS).await {
        Ok(Head::Hls(playlist)) => preload_first_segment(&ctx, &playlist).await,
        Ok(Head::Progressive { total_len }) => {
            log::debug!("[player::preload] Track {} is progressive ({} bytes); head cached", track.track_id, total_len);
            Ok(())
        }
        Err(failure) => Err(failure),
    };
    match result {
        Ok(()) => log::debug!("[player::preload] Track {} head cached ({})", track.track_id, url_prefix(&track.url)),
        Err(failure) => {
            log::info!("[player::preload] Track {} preload failed (best-effort): {} ({})", track.track_id, failure.detail(), url_prefix(&track.url))
        }
    }
}

async fn preload_first_segment(ctx: &FetchContext, playlist: &MediaPlaylist) -> Result<(), FetchFailure> {
    fetch_init(ctx, playlist, PRELOAD_MAX_ATTEMPTS).await?;
    let Some(segment) = playlist.segments.first() else {
        log::debug!("[player::preload] HLS playlist has no segments");
        return Ok(());
    };
    log::debug!("[player::preload] Fetching first segment (sequence {})", segment.sequence);
    fetch_part(ctx, &segment.url, segment.key.as_ref(), segment.sequence, PRELOAD_MAX_ATTEMPTS).await.map(|_| ())
}

pub fn purge(cache: &SegmentCache, keep_track_ids: Vec<u64>) {
    log::info!("[player::preload] Purging cache; keeping {} track(s)", keep_track_ids.len());
    let keep: HashSet<u64> = keep_track_ids.into_iter().collect();
    cache.purge(&keep);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preload_context_owns_entries_for_track() {
        let cache = Arc::new(SegmentCache::default());
        let ctx = preload_context(cache.clone(), 9);
        assert_eq!(ctx.owner, Some(9));
        ctx.cache.put_blob(ctx.owner, "seg".into(), Arc::new(vec![1]));
        purge(&cache, vec![]);
        assert!(cache.get_blob("seg").is_none());
    }

    #[test]
    fn purge_keeps_listed_tracks() {
        let cache = SegmentCache::default();
        cache.put_blob(Some(1), "a".into(), Arc::new(vec![1]));
        cache.put_blob(Some(2), "b".into(), Arc::new(vec![1]));
        purge(&cache, vec![2]);
        assert!(cache.get_blob("a").is_none());
        assert!(cache.get_blob("b").is_some());
    }
}
