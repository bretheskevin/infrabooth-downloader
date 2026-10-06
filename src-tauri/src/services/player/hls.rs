use std::io::{self, Read, Seek, SeekFrom};
use std::sync::Arc;
use std::time::Duration;

use symphonia::core::io::MediaSource;

use super::crypto::{decrypt_aes128_cbc, iv_for_sequence, key_from_bytes};
use super::fetch::{FetchFailure, SEGMENT_MAX_ATTEMPTS};
use super::head::FetchContext;
use super::messages::PipelineEvent;
use super::part_store::{PartStore, Retention};
use super::playlist::{KeyInfo, MediaPlaylist};
use super::url_prefix;

pub const READ_AHEAD_MS: u64 = 300_000;
const IDLE_WAIT: Duration = Duration::from_millis(250);

pub type SegmentStore = PartStore<usize>;

pub fn segment_store(start_index: usize) -> Arc<SegmentStore> {
    Arc::new(PartStore::new("segment", start_index, Retention { keep: |part, reading| part >= reading, only_on_change: false }))
}

pub struct SegmentReader {
    store: Arc<SegmentStore>,
    pending_init: Option<Arc<Vec<u8>>>,
    next_index: usize,
    end_index: usize,
    current: Arc<Vec<u8>>,
    offset: usize,
}

impl SegmentReader {
    pub fn new(store: Arc<SegmentStore>, init: Option<Arc<Vec<u8>>>, start_index: usize, end_index: usize) -> Self {
        Self { store, pending_init: init, next_index: start_index, end_index, current: Arc::new(Vec::new()), offset: 0 }
    }

    fn advance(&mut self) -> io::Result<bool> {
        if let Some(init) = self.pending_init.take() {
            self.current = init;
            self.offset = 0;
            return Ok(true);
        }
        if self.next_index >= self.end_index {
            return Ok(false);
        }
        self.store.set_reading(self.next_index);
        self.current = self
            .store
            .wait_for(self.next_index)
            .inspect_err(|e| log::warn!("[player::hls] Reader stopped at segment {}: kind={:?}, {}", self.next_index, e.kind(), e))?;
        self.next_index += 1;
        self.offset = 0;
        Ok(true)
    }
}

impl Read for SegmentReader {
    fn read(&mut self, out: &mut [u8]) -> io::Result<usize> {
        if out.is_empty() {
            return Ok(0);
        }
        while self.offset >= self.current.len() {
            if !self.advance()? {
                return Ok(0);
            }
        }
        let count = out.len().min(self.current.len() - self.offset);
        out[..count].copy_from_slice(&self.current[self.offset..self.offset + count]);
        self.offset += count;
        Ok(count)
    }
}

impl Seek for SegmentReader {
    fn seek(&mut self, _from: SeekFrom) -> io::Result<u64> {
        Err(io::Error::new(io::ErrorKind::Unsupported, "HLS segment stream is not seekable"))
    }
}

impl MediaSource for SegmentReader {
    fn is_seekable(&self) -> bool {
        false
    }

    fn byte_len(&self) -> Option<u64> {
        None
    }
}

pub struct HlsFetchJob {
    pub ctx: FetchContext,
    pub playlist: Arc<MediaPlaylist>,
    pub store: Arc<SegmentStore>,
    pub start_index: usize,
}

pub async fn run_hls_fetch(job: HlsFetchJob) {
    let HlsFetchJob { ctx, playlist, store, start_index } = job;
    let total = playlist.segments.len();
    log::info!("[player::hls] Fetch loop starting at segment {}/{}", start_index + 1, total);
    for index in start_index..total {
        if !wait_for_read_ahead(&ctx, &playlist, &store, index).await {
            log::debug!("[player::hls] Fetch loop cancelled at segment {}", index + 1);
            return;
        }
        let segment = &playlist.segments[index];
        let fetched = fetch_part(&ctx, &segment.url, segment.key.as_ref(), segment.sequence, SEGMENT_MAX_ATTEMPTS).await;
        match fetched {
            Ok(bytes) => {
                store.insert(index, bytes);
                ctx.report(PipelineEvent::SegmentLoaded);
            }
            Err(failure) => {
                log::warn!(
                    "[player::hls] Segment {}/{} failed after up to {} attempts: {} ({})",
                    index + 1,
                    total,
                    SEGMENT_MAX_ATTEMPTS,
                    failure.detail(),
                    url_prefix(&segment.url)
                );
                store.fail();
                ctx.report_failure(&failure);
                return;
            }
        }
    }
    log::info!("[player::hls] All {} segments buffered", total);
    ctx.report(PipelineEvent::FullyBuffered);
}

async fn wait_for_read_ahead(ctx: &FetchContext, playlist: &MediaPlaylist, store: &SegmentStore, index: usize) -> bool {
    loop {
        if ctx.scope.is_cancelled() {
            return false;
        }
        let reading = store.reading().min(playlist.segments.len() - 1);
        if playlist.segments[index].start_ms <= playlist.segments[reading].start_ms + READ_AHEAD_MS {
            return true;
        }
        store.wait_wake(IDLE_WAIT).await;
    }
}

pub async fn fetch_part(ctx: &FetchContext, url: &str, key: Option<&KeyInfo>, sequence: u64, max_attempts: u32) -> Result<Arc<Vec<u8>>, FetchFailure> {
    if let Some(cached) = ctx.cache.get_blob(url) {
        log::debug!("[player::hls] Cache hit: {}", url_prefix(url));
        return Ok(cached);
    }
    let body = ctx.fetch(url, None, max_attempts).await?;
    let bytes = match key {
        Some(key) => decrypt_part(ctx, key, sequence, &body.bytes, max_attempts).await?,
        None => body.bytes,
    };
    let bytes = Arc::new(bytes);
    ctx.cache.put_blob(ctx.owner, url.to_string(), bytes.clone());
    Ok(bytes)
}

async fn decrypt_part(ctx: &FetchContext, key: &KeyInfo, sequence: u64, data: &[u8], max_attempts: u32) -> Result<Vec<u8>, FetchFailure> {
    let key_bytes = fetch_key(ctx, &key.uri, max_attempts).await?;
    let iv = key.iv.unwrap_or_else(|| iv_for_sequence(sequence));
    decrypt_aes128_cbc(data, &key_bytes, &iv).map_err(|e| {
        log::error!("[player::hls] Decrypt failed for sequence {}: {}", sequence, e);
        FetchFailure::Invalid(e.to_string())
    })
}

async fn fetch_key(ctx: &FetchContext, uri: &str, max_attempts: u32) -> Result<[u8; 16], FetchFailure> {
    if let Some(key) = ctx.cache.get_key(uri) {
        return Ok(key);
    }
    log::info!("[player::hls] Fetching AES-128 key from {}", url_prefix(uri));
    let body = ctx.fetch(uri, None, max_attempts).await.inspect_err(|f| log::warn!("[player::hls] Key fetch failed: {} ({})", f.detail(), url_prefix(uri)))?;
    let key = key_from_bytes(&body.bytes).map_err(|e| {
        log::error!("[player::hls] Invalid AES key ({} bytes): {}", body.bytes.len(), e);
        FetchFailure::Invalid(e.to_string())
    })?;
    ctx.cache.put_key(ctx.owner, uri.to_string(), key);
    Ok(key)
}

pub async fn fetch_init(ctx: &FetchContext, playlist: &MediaPlaylist, max_attempts: u32) -> Result<Option<Arc<Vec<u8>>>, FetchFailure> {
    match &playlist.init {
        None => Ok(None),
        Some(init) => {
            log::info!("[player::hls] Fetching init section {}", url_prefix(&init.url));
            fetch_part(ctx, &init.url, init.key.as_ref(), playlist.media_sequence, max_attempts).await.map(Some)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::player::ports::Close;
    use std::io::Read;
    use std::thread;
    use std::time::Duration;

    fn part(bytes: &[u8]) -> Arc<Vec<u8>> {
        Arc::new(bytes.to_vec())
    }

    #[test]
    fn reader_concatenates_init_and_segments_then_eof() {
        let store = segment_store(0);
        store.insert(0, part(b"AB"));
        store.insert(1, part(b""));
        store.insert(2, part(b"CD"));
        let mut reader = SegmentReader::new(store, Some(part(b"I")), 0, 3);
        let mut out = Vec::new();
        reader.read_to_end(&mut out).unwrap();
        assert_eq!(out, b"IABCD");
    }

    #[test]
    fn reader_starts_at_given_index() {
        let store = segment_store(1);
        store.insert(1, part(b"XY"));
        let mut reader = SegmentReader::new(store, None, 1, 2);
        let mut out = Vec::new();
        reader.read_to_end(&mut out).unwrap();
        assert_eq!(out, b"XY");
    }

    #[test]
    fn reader_blocks_until_segment_arrives() {
        let store = segment_store(0);
        let producer = {
            let store = store.clone();
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(50));
                store.insert(0, part(b"Z"));
            })
        };
        let mut reader = SegmentReader::new(store, None, 0, 1);
        let mut buf = [0u8; 4];
        assert_eq!(reader.read(&mut buf).unwrap(), 1);
        producer.join().unwrap();
    }

    #[test]
    fn closed_or_failed_store_errors() {
        let store = segment_store(0);
        store.close();
        assert!(SegmentReader::new(store, None, 0, 1).read(&mut [0u8; 4]).is_err());
        let store = segment_store(0);
        store.fail();
        assert!(SegmentReader::new(store, None, 0, 1).read(&mut [0u8; 4]).is_err());
    }

    #[test]
    fn reader_is_not_seekable() {
        let reader = SegmentReader::new(segment_store(0), None, 0, 1);
        assert!(!reader.is_seekable());
        assert_eq!(reader.byte_len(), None);
    }
}
