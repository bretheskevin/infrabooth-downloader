use std::sync::Arc;

use symphonia::core::io::MediaSource;

use super::decoder::{spawn_decoder, DecodeCtx, DecodeJob, StartMode};
use super::fetch::{PLAYLIST_MAX_ATTEMPTS, SEGMENT_MAX_ATTEMPTS};
use super::head::{fetch_head, FetchContext, Head};
use super::hls::{fetch_init, run_hls_fetch, segment_store, HlsFetchJob, SegmentReader};
use super::messages::{EngineMsg, PipelineId};
use super::playlist::MediaPlaylist;
use super::ports::{CancelScope, Pipeline, PipelineFactory, PipelineRequest};
use super::progressive::{run_progressive_fetch, ChunkReader, ChunkStore, ProgressiveFetchJob};
use super::segment_cache::SegmentCache;
use super::url_prefix;

pub struct StreamPipelineFactory {
    cache: Arc<SegmentCache>,
}

impl StreamPipelineFactory {
    pub fn new(cache: Arc<SegmentCache>) -> Self {
        Self { cache }
    }
}

struct StreamPipeline {
    id: PipelineId,
    scope: Arc<CancelScope>,
}

impl Pipeline for StreamPipeline {
    fn cancel(&self) {
        log::debug!("[player::pipeline] Cancelling pipeline {}", self.id.0);
        self.scope.cancel();
    }
}

impl PipelineFactory for StreamPipelineFactory {
    fn start(&self, request: PipelineRequest) -> Box<dyn Pipeline> {
        let scope = Arc::new(CancelScope::default());
        let id = request.id;
        log::info!("[player::pipeline] Starting pipeline {} at {}ms (epoch {}): {}", id.0, request.start_ms, request.epoch, url_prefix(&request.url));
        let run = PipelineRun { request, scope: scope.clone(), cache: self.cache.clone() };
        tauri::async_runtime::spawn(run.execute());
        Box::new(StreamPipeline { id, scope })
    }
}

struct PipelineRun {
    request: PipelineRequest,
    scope: Arc<CancelScope>,
    cache: Arc<SegmentCache>,
}

impl PipelineRun {
    fn fetch_context(&self) -> FetchContext {
        let notify = self.request.notify.clone();
        let pipeline_id = self.request.id;
        FetchContext {
            cache: self.cache.clone(),
            scope: self.scope.clone(),
            owner: None,
            reporter: Arc::new(move |event| {
                let _ = notify.send(EngineMsg::Pipeline { pipeline_id, event });
            }),
        }
    }

    async fn execute(self) {
        let ctx = self.fetch_context();
        let id = self.request.id.0;
        let head = match fetch_head(&ctx, &self.request.url, PLAYLIST_MAX_ATTEMPTS).await {
            Ok(head) => head,
            Err(failure) => {
                log::warn!("[player::pipeline] Head fetch failed for pipeline {}: {}", id, failure.detail());
                ctx.report_failure(&failure);
                return;
            }
        };
        if self.scope.is_cancelled() {
            log::debug!("[player::pipeline] Pipeline {} cancelled after head fetch", id);
            return;
        }
        match head {
            Head::Hls(playlist) => self.run_hls(ctx, playlist).await,
            Head::Progressive { total_len } => self.run_progressive(ctx, total_len).await,
        }
    }

    async fn run_hls(self, ctx: FetchContext, playlist: Arc<MediaPlaylist>) {
        let id = self.request.id.0;
        let start_index = playlist.start_index_for(self.request.start_ms);
        let Some(first) = playlist.segments.get(start_index) else {
            log::error!("[player::pipeline] Pipeline {} HLS playlist has no segment at index {}", id, start_index);
            return;
        };
        let skip_ms = self.request.start_ms.saturating_sub(first.start_ms);
        let hint = if playlist.init.is_some() { Some("mp4".to_string()) } else { extension_hint(&first.url) };
        let init = match fetch_init(&ctx, &playlist, SEGMENT_MAX_ATTEMPTS).await {
            Ok(init) => init,
            Err(failure) => {
                log::warn!("[player::pipeline] Pipeline {} init segment fetch failed: {}", id, failure.detail());
                ctx.report_failure(&failure);
                return;
            }
        };
        let store = segment_store(start_index);
        self.scope.register(store.clone());
        log::info!(
            "[player::pipeline] Pipeline {} flow=HLS segment {}/{} start=SkipMs({}) hint={:?} encrypted={}",
            id,
            start_index + 1,
            playlist.segments.len(),
            skip_ms,
            hint,
            playlist.is_encrypted()
        );
        let reader = SegmentReader::new(store.clone(), init, start_index, playlist.segments.len());
        spawn_decoder(self.decode_job(Box::new(reader), hint, StartMode::SkipMs(skip_ms), Some(playlist.total_ms)));
        run_hls_fetch(HlsFetchJob { ctx, playlist, store, start_index }).await;
    }

    async fn run_progressive(self, ctx: FetchContext, total_len: u64) {
        let store = ChunkStore::new(total_len);
        self.scope.register(store.clone());
        let start = if self.request.start_ms > 0 { StartMode::SeekMs(self.request.start_ms) } else { StartMode::FromBeginning };
        let hint = extension_hint(&self.request.url);
        log::info!("[player::pipeline] Pipeline {} flow=progressive {} bytes start={:?} hint={:?}", self.request.id.0, total_len, start, hint);
        spawn_decoder(self.decode_job(Box::new(ChunkReader::new(store.clone())), hint, start, None));
        run_progressive_fetch(ProgressiveFetchJob { ctx, url: self.request.url.clone(), store }).await;
    }

    fn decode_job(&self, source: Box<dyn MediaSource>, extension_hint: Option<String>, start: StartMode, duration_hint_ms: Option<u64>) -> DecodeJob {
        DecodeJob {
            source,
            extension_hint,
            ctx: DecodeCtx {
                start,
                duration_hint_ms,
                feed: self.request.feed.clone(),
                epoch: self.request.epoch,
                pipeline_id: self.request.id,
                notify: self.request.notify.clone(),
                scope: self.scope.clone(),
            },
        }
    }
}

pub fn extension_hint(url: &str) -> Option<String> {
    let parsed = url::Url::parse(url).ok()?;
    let last = parsed.path_segments()?.next_back()?;
    let ext = last.rsplit_once('.')?.1.to_ascii_lowercase();
    match ext.as_str() {
        "m4s" | "mp4" | "m4a" => Some("mp4".into()),
        "mp3" | "aac" => Some(ext),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_hints() {
        assert_eq!(extension_hint("https://cf-media.sndcdn.com/abc.128.mp3?Policy=x"), Some("mp3".into()));
        assert_eq!(extension_hint("https://cdn/x/seg12.m4s?sig=1"), Some("mp4".into()));
        assert_eq!(extension_hint("https://cdn/x/seg.aac"), Some("aac".into()));
        assert_eq!(extension_hint("https://cdn/x/playlist"), None);
        assert_eq!(extension_hint("https://cdn/x/seg.ts"), None);
        assert_eq!(extension_hint("not a url"), None);
    }
}
