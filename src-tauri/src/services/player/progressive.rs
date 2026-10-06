use std::io::{self, Read, Seek, SeekFrom};
use std::ops::Deref;
use std::sync::Arc;
use std::time::Duration;

use symphonia::core::io::MediaSource;

use super::fetch::{FetchFailure, SEGMENT_MAX_ATTEMPTS};
use super::head::{FetchContext, CHUNK_SIZE};
use super::messages::PipelineEvent;
use super::part_store::{PartStore, Retention};
use super::ports::Close;
use super::segment_cache::SegmentCache;
use super::url_prefix;

pub const READ_AHEAD_CHUNKS: u64 = 20;
const IDLE_WAIT: Duration = Duration::from_millis(250);

pub struct ChunkStore {
    parts: PartStore<u64>,
    total_len: u64,
}

impl ChunkStore {
    pub fn new(total_len: u64) -> Arc<Self> {
        let retention = Retention { keep: |part, reading| *part + 1 >= *reading && *part <= *reading + READ_AHEAD_CHUNKS, only_on_change: true };
        Arc::new(Self { parts: PartStore::new("chunk", 0, retention), total_len })
    }

    pub fn total_len(&self) -> u64 {
        self.total_len
    }

    pub fn chunk_count(&self) -> u64 {
        self.total_len.div_ceil(CHUNK_SIZE)
    }
}

impl Deref for ChunkStore {
    type Target = PartStore<u64>;

    fn deref(&self) -> &Self::Target {
        &self.parts
    }
}

impl Close for ChunkStore {
    fn close(&self) {
        self.parts.close();
    }
}

pub struct ChunkReader {
    store: Arc<ChunkStore>,
    pos: u64,
}

impl ChunkReader {
    pub fn new(store: Arc<ChunkStore>) -> Self {
        Self { store, pos: 0 }
    }
}

impl Read for ChunkReader {
    fn read(&mut self, out: &mut [u8]) -> io::Result<usize> {
        if out.is_empty() || self.pos >= self.store.total_len() {
            return Ok(0);
        }
        let index = self.pos / CHUNK_SIZE;
        self.store.set_reading(index);
        let chunk =
            self.store.wait_for(index).inspect_err(|e| log::warn!("[player::progressive] Reader stopped at chunk {}: kind={:?}, {}", index, e.kind(), e))?;
        let offset = (self.pos - index * CHUNK_SIZE) as usize;
        if offset >= chunk.len() {
            return Err(io::Error::new(io::ErrorKind::UnexpectedEof, format!("chunk {index} shorter than expected ({} bytes)", chunk.len())));
        }
        let count = out.len().min(chunk.len() - offset);
        out[..count].copy_from_slice(&chunk[offset..offset + count]);
        self.pos += count as u64;
        Ok(count)
    }
}

impl Seek for ChunkReader {
    fn seek(&mut self, from: SeekFrom) -> io::Result<u64> {
        let target = match from {
            SeekFrom::Start(n) => n as i128,
            SeekFrom::Current(delta) => self.pos as i128 + delta as i128,
            SeekFrom::End(delta) => self.store.total_len() as i128 + delta as i128,
        };
        if target < 0 {
            log::warn!("[player::progressive] Rejected seek {:?} from pos {} (target {})", from, self.pos, target);
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "seek before start of stream"));
        }
        log::debug!("[player::progressive] Seek {:?}: {} -> {}", from, self.pos, target);
        self.pos = target as u64;
        Ok(self.pos)
    }
}

impl MediaSource for ChunkReader {
    fn is_seekable(&self) -> bool {
        true
    }

    fn byte_len(&self) -> Option<u64> {
        Some(self.store.total_len())
    }
}

pub struct ProgressiveFetchJob {
    pub ctx: FetchContext,
    pub url: String,
    pub store: Arc<ChunkStore>,
}

pub async fn run_progressive_fetch(job: ProgressiveFetchJob) {
    let ProgressiveFetchJob { ctx, url, store } = job;
    let mut announced_full = false;
    log::info!("[player::progressive] Fetch loop starting: {} chunks, {}", store.chunk_count(), url_prefix(&url));
    while !ctx.scope.is_cancelled() {
        let count = store.chunk_count();
        let reading = store.reading();
        let horizon = (reading + READ_AHEAD_CHUNKS).min(count);
        let Some(index) = store.first_missing(reading..horizon) else {
            if horizon == count && !announced_full {
                announced_full = true;
                log::info!("[player::progressive] All {} chunks from {} buffered", count, reading);
                ctx.report(PipelineEvent::FullyBuffered);
            }
            store.wait_wake(IDLE_WAIT).await;
            continue;
        };
        if let Err(failure) = fetch_chunk(&ctx, &url, &store, index).await {
            log::warn!(
                "[player::progressive] Chunk {}/{} failed after up to {} attempts: {} ({})",
                index + 1,
                count,
                SEGMENT_MAX_ATTEMPTS,
                failure.detail(),
                url_prefix(&url)
            );
            store.fail();
            ctx.report_failure(&failure);
            return;
        }
    }
    log::debug!("[player::progressive] Fetch loop cancelled");
}

pub async fn fetch_chunk(ctx: &FetchContext, url: &str, store: &ChunkStore, index: u64) -> Result<(), FetchFailure> {
    let key = SegmentCache::chunk_key(url, index);
    if let Some(cached) = ctx.cache.get_blob(&key) {
        store.insert(index, cached);
        return Ok(());
    }
    let start = index * CHUNK_SIZE;
    let end = (start + CHUNK_SIZE).min(store.total_len()).saturating_sub(1);
    let mut body = ctx.fetch(url, Some((start, end)), SEGMENT_MAX_ATTEMPTS).await?;
    if body.status == 200 {
        if start > 0 {
            log::warn!("[player::progressive] Server ignored Range for chunk {} (status 200, {} bytes)", index, body.bytes.len());
            return Err(FetchFailure::Invalid("server ignored Range request".into()));
        }
        body.bytes.truncate(CHUNK_SIZE as usize);
    }
    let bytes = Arc::new(body.bytes);
    ctx.cache.put_blob(ctx.owner, key, bytes.clone());
    store.insert(index, bytes);
    ctx.report(PipelineEvent::SegmentLoaded);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Seek, SeekFrom};

    fn filled_store(total: u64) -> Arc<ChunkStore> {
        let store = ChunkStore::new(total);
        for index in 0..store.chunk_count() {
            let start = index * CHUNK_SIZE;
            let end = (start + CHUNK_SIZE).min(total);
            store.insert(index, Arc::new((start..end).map(|i| (i % 251) as u8).collect()));
        }
        store
    }

    #[test]
    fn chunk_count_rounds_up() {
        assert_eq!(ChunkStore::new(CHUNK_SIZE * 2 + 1).chunk_count(), 3);
        assert_eq!(ChunkStore::new(CHUNK_SIZE).chunk_count(), 1);
    }

    #[test]
    fn reads_across_chunk_boundary() {
        let total = CHUNK_SIZE + 10;
        let mut reader = ChunkReader::new(filled_store(total));
        reader.seek(SeekFrom::Start(CHUNK_SIZE - 2)).unwrap();
        let mut out = Vec::new();
        reader.read_to_end(&mut out).unwrap();
        assert_eq!(out.len(), 12);
        assert_eq!(out[2], (CHUNK_SIZE % 251) as u8);
    }

    #[test]
    fn seeks_from_end_and_reports_length() {
        let mut reader = ChunkReader::new(filled_store(100));
        assert_eq!(reader.seek(SeekFrom::End(-10)).unwrap(), 90);
        assert!(reader.is_seekable());
        assert_eq!(reader.byte_len(), Some(100));
        assert!(reader.seek(SeekFrom::Current(-200)).is_err());
    }

    #[test]
    fn closed_store_errors_reader() {
        let store = ChunkStore::new(10);
        store.close();
        assert!(ChunkReader::new(store).read(&mut [0u8; 4]).is_err());
    }

    #[test]
    fn set_reading_keeps_one_chunk_behind_and_read_ahead_window() {
        let store = ChunkStore::new(CHUNK_SIZE * 40);
        for index in [0, 4, 5, 6, 5 + READ_AHEAD_CHUNKS, 6 + READ_AHEAD_CHUNKS] {
            store.insert(index, Arc::new(vec![0]));
        }
        store.set_reading(5);
        assert!(!store.has(0));
        assert!(store.has(4));
        assert!(store.has(5 + READ_AHEAD_CHUNKS));
        assert!(!store.has(6 + READ_AHEAD_CHUNKS));
    }
}
