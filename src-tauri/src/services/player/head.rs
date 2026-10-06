use std::sync::Arc;

use super::fetch::{fetch_with_retry, FetchFailure, FetchedBody, RetryPolicy};
use super::messages::{NetworkErrorKind, PipelineEvent};
use super::playlist::{parse_media_playlist, MediaPlaylist};
use super::ports::CancelScope;
use super::segment_cache::SegmentCache;
use super::url_prefix;

pub const CHUNK_SIZE: u64 = 256 * 1024;

pub struct FetchContext {
    pub cache: Arc<SegmentCache>,
    pub scope: Arc<CancelScope>,
    pub owner: Option<u64>,
    pub reporter: Arc<dyn Fn(PipelineEvent) + Send + Sync>,
}

impl FetchContext {
    pub fn report(&self, event: PipelineEvent) {
        (self.reporter)(event);
    }

    pub fn report_failure(&self, failure: &FetchFailure) {
        if let Some(kind) = failure.network_kind() {
            self.report(PipelineEvent::NetworkError { kind, detail: failure.detail() });
        }
    }

    pub async fn fetch(&self, url: &str, range: Option<(u64, u64)>, max_attempts: u32) -> Result<FetchedBody, FetchFailure> {
        let on_failure = |detail: String| self.report(PipelineEvent::NetworkError { kind: NetworkErrorKind::NonFatal, detail });
        fetch_with_retry(url, range, &RetryPolicy { max_attempts, cancel: &self.scope, on_retryable_failure: &on_failure }).await
    }
}

pub enum Head {
    Hls(Arc<MediaPlaylist>),
    Progressive { total_len: u64 },
}

pub async fn fetch_head(ctx: &FetchContext, url: &str, max_attempts: u32) -> Result<Head, FetchFailure> {
    if let Some(playlist) = ctx.cache.get_playlist(url) {
        log::debug!("[player::head] Playlist cache hit: {}", url_prefix(url));
        return Ok(Head::Hls(playlist));
    }
    if let Some(total_len) = ctx.cache.get_length(url) {
        log::debug!("[player::head] Progressive cache hit ({} bytes): {}", total_len, url_prefix(url));
        return Ok(Head::Progressive { total_len });
    }
    log::debug!("[player::head] Classifying {}", url_prefix(url));
    let body = ctx
        .fetch(url, Some((0, CHUNK_SIZE - 1)), max_attempts)
        .await
        .inspect_err(|failure| log::warn!("[player::head] Head fetch failed: {} ({})", failure.detail(), url_prefix(url)))?;
    if !is_playlist(&body.bytes) {
        return Ok(store_progressive_head(ctx, url, body));
    }
    let complete = body.total_len.map_or(true, |total| total <= body.bytes.len() as u64);
    let bytes = if complete { body.bytes } else { refetch_full_playlist(ctx, url, max_attempts).await? };
    store_playlist(ctx, url, &bytes)
}

async fn refetch_full_playlist(ctx: &FetchContext, url: &str, max_attempts: u32) -> Result<Vec<u8>, FetchFailure> {
    log::info!("[player::head] Ranged playlist response was truncated; refetching without Range ({})", url_prefix(url));
    ctx.fetch(url, None, max_attempts)
        .await
        .map(|body| body.bytes)
        .inspect_err(|failure| log::warn!("[player::head] Full playlist refetch failed: {}", failure.detail()))
}

pub fn is_playlist(bytes: &[u8]) -> bool {
    let without_bom = bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes);
    let start = without_bom.iter().position(|b| !b.is_ascii_whitespace()).unwrap_or(without_bom.len());
    without_bom[start..].starts_with(b"#EXTM3U")
}

fn store_playlist(ctx: &FetchContext, url: &str, bytes: &[u8]) -> Result<Head, FetchFailure> {
    let text = String::from_utf8_lossy(bytes);
    let playlist = parse_media_playlist(&text, url).map_err(|e| {
        log::error!("[player::head] Playlist parse failed: {} ({})", e, url_prefix(url));
        FetchFailure::Invalid(e.to_string())
    })?;
    log::info!(
        "[player::head] HLS playlist: {} segments, {}ms, encrypted={}, init={}, url={}",
        playlist.segments.len(),
        playlist.total_ms,
        playlist.is_encrypted(),
        playlist.init.is_some(),
        url_prefix(url)
    );
    let playlist = Arc::new(playlist);
    ctx.cache.put_playlist(ctx.owner, url.to_string(), playlist.clone());
    Ok(Head::Hls(playlist))
}

fn store_progressive_head(ctx: &FetchContext, url: &str, body: FetchedBody) -> Head {
    let total_len = body.total_len.unwrap_or(body.bytes.len() as u64);
    log::info!("[player::head] Progressive stream: status={}, total_len={}, first_bytes={}, url={}", body.status, total_len, body.bytes.len(), url_prefix(url));
    ctx.cache.put_length(ctx.owner, url.to_string(), total_len);
    for (index, chunk) in body.bytes.chunks(CHUNK_SIZE as usize).enumerate() {
        ctx.cache.put_blob(ctx.owner, SegmentCache::chunk_key(url, index as u64), Arc::new(chunk.to_vec()));
    }
    Head::Progressive { total_len }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_playlists() {
        assert!(is_playlist(b"#EXTM3U\n#EXTINF:1,\na"));
        assert!(is_playlist(b"\xEF\xBB\xBF  #EXTM3U\n"));
        assert!(!is_playlist(b"ID3\x04\x00"));
        assert!(!is_playlist(b""));
    }
}
