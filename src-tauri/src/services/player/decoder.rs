use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::mpsc::Sender;
use std::sync::Arc;

use symphonia::core::audio::{AudioBufferRef, SampleBuffer, SignalSpec};
use symphonia::core::codecs::{Decoder, DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::{FormatOptions, FormatReader, SeekMode, SeekTo};
use symphonia::core::io::{MediaSource, MediaSourceStream};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;

use super::feed::{AudioSpec, Feed, READY_BUFFER_MS};
use super::messages::{EngineMsg, PipelineEvent, PipelineId};
use super::ports::CancelScope;
use super::runner::panic_message;

const MAX_CONSECUTIVE_DECODE_ERRORS: u32 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartMode {
    FromBeginning,
    SkipMs(u64),
    SeekMs(u64),
}

pub struct DecodeCtx {
    pub start: StartMode,
    pub duration_hint_ms: Option<u64>,
    pub feed: Arc<Feed>,
    pub epoch: u64,
    pub pipeline_id: PipelineId,
    pub notify: Sender<EngineMsg>,
    pub scope: Arc<CancelScope>,
}

impl DecodeCtx {
    fn send(&self, event: PipelineEvent) {
        if self.notify.send(EngineMsg::Pipeline { pipeline_id: self.pipeline_id, event }).is_err() {
            log::debug!("[player::decoder] Engine gone; dropping event for pipeline {}", self.pipeline_id.0);
        }
    }
}

pub struct DecodeJob {
    pub source: Box<dyn MediaSource>,
    pub extension_hint: Option<String>,
    pub ctx: DecodeCtx,
}

enum DecodeExit {
    Cancelled,
    SourceClosed(String),
    Failed(String),
    Unsupported(String),
}

pub fn spawn_decoder(job: DecodeJob) {
    let notify = job.ctx.notify.clone();
    let pipeline_id = job.ctx.pipeline_id;
    let report = notify.clone();
    let spawned = std::thread::Builder::new().name("player-decoder".into()).spawn(move || {
        if let Err(payload) = catch_unwind(AssertUnwindSafe(|| run_decoder(job))) {
            let reason = panic_message(payload.as_ref());
            log::error!("[player::decoder] Decoder thread for pipeline {} panicked: {}", pipeline_id.0, reason);
            let event = PipelineEvent::DecoderFailed { message: format!("Decode error: decoder crashed: {reason}") };
            let _ = report.send(EngineMsg::Pipeline { pipeline_id, event });
        }
    });
    if let Err(e) = spawned {
        log::error!("[player::decoder] Failed to spawn decoder thread for pipeline {}: {} (kind={:?})", pipeline_id.0, e, e.kind());
        let event = PipelineEvent::DecoderFailed { message: format!("Decode error: could not start decoder thread: {e}") };
        let _ = notify.send(EngineMsg::Pipeline { pipeline_id, event });
    }
}

pub fn run_decoder(job: DecodeJob) {
    let DecodeJob { source, extension_hint, ctx } = job;
    let id = ctx.pipeline_id.0;
    match decode_stream(source, extension_hint.as_deref(), &ctx) {
        Ok(()) => {
            ctx.feed.finish(ctx.epoch);
            log::info!("[player::decoder] Pipeline {} decoded to end", id);
            ctx.send(PipelineEvent::DecoderFinished);
        }
        Err(DecodeExit::Cancelled) => log::debug!("[player::decoder] Pipeline {} cancelled", id),
        Err(DecodeExit::SourceClosed(reason)) => log::info!("[player::decoder] Pipeline {} source closed: {}", id, reason),
        Err(DecodeExit::Failed(reason)) => {
            log::error!("[player::decoder] Pipeline {} decode failed: {}", id, reason);
            ctx.send(PipelineEvent::DecoderFailed { message: format!("Decode error: {reason}") });
        }
        Err(DecodeExit::Unsupported(reason)) => {
            log::error!("[player::decoder] Pipeline {} unsupported stream: {}", id, reason);
            ctx.send(PipelineEvent::DecoderFailed { message: format!("Unsupported codec: {reason}") });
        }
    }
}

struct OpenedStream {
    format: Box<dyn FormatReader>,
    decoder: Box<dyn Decoder>,
    track_id: u32,
    sample_rate: u32,
    n_frames: Option<u64>,
}

fn classify_open_error(error: SymphoniaError) -> DecodeExit {
    match error {
        SymphoniaError::IoError(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => DecodeExit::Failed(format!("stream ended during probe: {e}")),
        SymphoniaError::IoError(e) => DecodeExit::SourceClosed(e.to_string()),
        SymphoniaError::Unsupported(what) => DecodeExit::Unsupported(what.to_string()),
        other => DecodeExit::Failed(other.to_string()),
    }
}

fn open_stream(source: Box<dyn MediaSource>, extension_hint: Option<&str>) -> Result<OpenedStream, DecodeExit> {
    let mss = MediaSourceStream::new(source, Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = extension_hint {
        hint.with_extension(ext);
    }
    let format_options = FormatOptions { enable_gapless: true, ..Default::default() };
    let probed = symphonia::default::get_probe().format(&hint, mss, &format_options, &MetadataOptions::default()).map_err(classify_open_error)?;
    let format = probed.format;
    let track = format.tracks().iter().find(|t| t.codec_params.codec != CODEC_TYPE_NULL).ok_or_else(|| DecodeExit::Unsupported("no audio track".into()))?;
    let params = track.codec_params.clone();
    let track_id = track.id;
    let codec_name = symphonia::default::get_codecs().get_codec(params.codec).map_or("unknown", |d| d.short_name);
    log::info!(
        "[player::decoder] Probed stream: codec={}, sample_rate={:?}, channels={:?}, n_frames={:?}, hint={:?}",
        codec_name,
        params.sample_rate,
        params.channels.map(|c| c.count()),
        params.n_frames,
        extension_hint
    );
    let decoder =
        symphonia::default::get_codecs().make(&params, &DecoderOptions::default()).map_err(|e| DecodeExit::Unsupported(format!("{codec_name}: {e}")))?;
    Ok(OpenedStream { format, decoder, track_id, sample_rate: params.sample_rate.unwrap_or(44_100), n_frames: params.n_frames })
}

fn apply_start(opened: &mut OpenedStream, ctx: &DecodeCtx) -> Result<u64, DecodeExit> {
    log::info!("[player::decoder] Pipeline {} start mode: {:?}", ctx.pipeline_id.0, ctx.start);
    match ctx.start {
        StartMode::FromBeginning => Ok(0),
        StartMode::SkipMs(ms) => Ok(ms * opened.sample_rate as u64 / 1000),
        StartMode::SeekMs(ms) => seek_to(opened, ctx, ms),
    }
}

fn seek_to(opened: &mut OpenedStream, ctx: &DecodeCtx, ms: u64) -> Result<u64, DecodeExit> {
    let time = Time::new(ms / 1000, (ms % 1000) as f64 / 1000.0);
    let seeked = opened
        .format
        .seek(SeekMode::Coarse, SeekTo::Time { time, track_id: Some(opened.track_id) })
        .map_err(|e| DecodeExit::Failed(format!("seek to {ms}ms failed: {e}")))?;
    opened.decoder.reset();
    let rate = opened.sample_rate.max(1) as u64;
    let landed_ts = seeked.required_ts.max(seeked.actual_ts);
    ctx.feed.set_seek_base(ctx.epoch, landed_ts * 1000 / rate);
    log::info!("[player::decoder] Seeked to {}ms (required_ts={}, actual_ts={})", ms, seeked.required_ts, seeked.actual_ts);
    Ok(seeked.required_ts.saturating_sub(seeked.actual_ts))
}

fn decode_stream(source: Box<dyn MediaSource>, extension_hint: Option<&str>, ctx: &DecodeCtx) -> Result<(), DecodeExit> {
    let mut opened = open_stream(source, extension_hint)?;
    let skip_frames = apply_start(&mut opened, ctx)?;
    let duration_ms = ctx.duration_hint_ms.or_else(|| opened.n_frames.map(|n| n * 1000 / opened.sample_rate.max(1) as u64)).unwrap_or(0);
    let mut sink = PcmSink { ctx, skip_frames, duration_ms, buffer: None, buffer_capacity: 0, spec: None, pushed_frames: 0, ready_sent: false };
    let mut consecutive_errors = 0;
    loop {
        if ctx.scope.is_cancelled() {
            return Err(DecodeExit::Cancelled);
        }
        let packet = match opened.format.next_packet() {
            Ok(packet) => packet,
            Err(SymphoniaError::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(SymphoniaError::IoError(e)) => return Err(DecodeExit::SourceClosed(e.to_string())),
            Err(SymphoniaError::ResetRequired) => {
                opened.decoder.reset();
                continue;
            }
            Err(e) => return Err(DecodeExit::Failed(e.to_string())),
        };
        if packet.track_id() != opened.track_id {
            continue;
        }
        match opened.decoder.decode(&packet) {
            Ok(decoded) => {
                consecutive_errors = 0;
                sink.write(decoded)?;
            }
            Err(SymphoniaError::DecodeError(reason)) => {
                consecutive_errors += 1;
                log::debug!("[player::decoder] Skipping undecodable packet ({}), consecutive={}", reason, consecutive_errors);
                if consecutive_errors >= MAX_CONSECUTIVE_DECODE_ERRORS {
                    return Err(DecodeExit::Failed(reason.to_string()));
                }
            }
            Err(e) => return Err(DecodeExit::Failed(e.to_string())),
        }
    }
    sink.finish()
}

struct PcmSink<'a> {
    ctx: &'a DecodeCtx,
    skip_frames: u64,
    duration_ms: u64,
    buffer: Option<SampleBuffer<f32>>,
    buffer_capacity: u64,
    spec: Option<AudioSpec>,
    pushed_frames: u64,
    ready_sent: bool,
}

impl PcmSink<'_> {
    fn write(&mut self, decoded: AudioBufferRef<'_>) -> Result<(), DecodeExit> {
        let signal: SignalSpec = *decoded.spec();
        let spec = AudioSpec { sample_rate: signal.rate, channels: signal.channels.count().max(1) as u16 };
        self.ensure_spec(spec)?;
        let capacity = decoded.capacity() as u64;
        if self.buffer.is_none() || capacity > self.buffer_capacity {
            self.buffer = Some(SampleBuffer::new(capacity, signal));
            self.buffer_capacity = capacity;
        }
        let Some(buffer) = self.buffer.as_mut() else { return Ok(()) };
        buffer.copy_interleaved_ref(decoded);
        let channels = spec.channels as usize;
        let available = (buffer.samples().len() / channels) as u64;
        let skip = self.skip_frames.min(available);
        self.skip_frames -= skip;
        let samples = &buffer.samples()[skip as usize * channels..];
        if samples.is_empty() {
            return Ok(());
        }
        if !self.ctx.feed.push(self.ctx.epoch, samples) {
            return Err(DecodeExit::Cancelled);
        }
        self.pushed_frames += (samples.len() / channels) as u64;
        self.maybe_send_ready(spec.sample_rate);
        Ok(())
    }

    fn ensure_spec(&mut self, spec: AudioSpec) -> Result<(), DecodeExit> {
        match self.spec {
            Some(current) if current == spec => Ok(()),
            Some(current) => Err(DecodeExit::Failed(format!("stream format changed mid-stream: {current:?} -> {spec:?}"))),
            None => {
                if !self.ctx.feed.set_spec(self.ctx.epoch, spec) {
                    return Err(DecodeExit::Cancelled);
                }
                log::info!("[player::decoder] Output format: {} Hz, {} ch", spec.sample_rate, spec.channels);
                self.spec = Some(spec);
                Ok(())
            }
        }
    }

    fn maybe_send_ready(&mut self, sample_rate: u32) {
        if self.ready_sent || self.pushed_frames * 1000 / (sample_rate.max(1) as u64) < READY_BUFFER_MS {
            return;
        }
        self.ready_sent = true;
        self.ctx.send(PipelineEvent::Ready { duration_ms: self.duration_ms });
    }

    fn finish(&mut self) -> Result<(), DecodeExit> {
        if self.spec.is_none() || self.pushed_frames == 0 {
            return Err(DecodeExit::Failed("stream contained no audio".into()));
        }
        if !self.ready_sent {
            self.ready_sent = true;
            self.ctx.send(PipelineEvent::Ready { duration_ms: self.duration_ms });
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::player::feed::PopResult;
    use crate::services::player::hls::{segment_store, SegmentReader};
    use crate::services::player::playlist::parse_media_playlist;
    use std::io::Cursor;
    use std::path::PathBuf;
    use std::sync::mpsc;
    use std::time::{Duration, Instant};

    const RATE: u64 = 44_100;

    fn fixture_path(rel: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/player").join(rel)
    }

    fn fixture(rel: &str) -> Vec<u8> {
        std::fs::read(fixture_path(rel)).unwrap_or_else(|e| panic!("missing fixture {rel} ({e})"))
    }

    fn hls_reader(dir: &str) -> (SegmentReader, bool) {
        let text = String::from_utf8(fixture(&format!("{dir}/playlist.m3u8"))).unwrap();
        let playlist = parse_media_playlist(&text, &format!("https://fixture.local/{dir}/playlist.m3u8")).unwrap();
        let store = segment_store(0);
        for (index, segment) in playlist.segments.iter().enumerate() {
            let name = segment.url.rsplit('/').next().unwrap();
            store.insert(index, Arc::new(fixture(&format!("{dir}/{name}"))));
        }
        let init = playlist.init.as_ref().map(|i| Arc::new(fixture(&format!("{dir}/{}", i.url.rsplit('/').next().unwrap()))));
        let has_init = init.is_some();
        (SegmentReader::new(store, init, 0, playlist.segments.len()), has_init)
    }

    struct Drained {
        frames: u64,
        spec: Option<AudioSpec>,
        events: Vec<PipelineEvent>,
    }

    fn run_and_drain(source: Box<dyn MediaSource>, hint: Option<&str>, start: StartMode) -> Drained {
        let feed = Feed::new(0);
        let (tx, rx) = mpsc::channel();
        let ctx = DecodeCtx {
            start,
            duration_hint_ms: None,
            feed: feed.clone(),
            epoch: feed.epoch(),
            pipeline_id: PipelineId::next(),
            notify: tx,
            scope: Arc::new(CancelScope::default()),
        };
        let extension_hint = hint.map(str::to_string);
        let handle = std::thread::spawn(move || run_decoder(DecodeJob { source, extension_hint, ctx }));
        let deadline = Instant::now() + Duration::from_secs(20);
        let mut epoch = feed.epoch();
        let mut out = Vec::new();
        loop {
            match feed.pop_into(&mut epoch, &mut out, 8192) {
                PopResult::Drained => break,
                PopResult::Data => out.clear(),
                _ if handle.is_finished() && feed.buffered_ms() == 0 => break,
                _ => {
                    assert!(Instant::now() < deadline, "decoder timed out");
                    std::thread::sleep(Duration::from_millis(1));
                }
            }
        }
        handle.join().unwrap();
        let events = rx.try_iter().filter_map(|m| if let EngineMsg::Pipeline { event, .. } = m { Some(event) } else { None }).collect();
        Drained { frames: feed.frames_played(), spec: feed.spec(), events }
    }

    fn assert_frames_near(actual: u64, expected: u64) {
        let tolerance = expected / 20 + 2048;
        assert!(actual.abs_diff(expected) <= tolerance, "frames {actual} not within {tolerance} of {expected}");
    }

    fn assert_finished(events: &[PipelineEvent]) {
        assert!(events.iter().any(|e| matches!(e, PipelineEvent::Ready { .. })), "no Ready in {events:?}");
        assert!(events.contains(&PipelineEvent::DecoderFinished), "no DecoderFinished in {events:?}");
    }

    #[test]
    fn decodes_progressive_mp3() {
        let result = run_and_drain(Box::new(Cursor::new(fixture("tone.mp3"))), Some("mp3"), StartMode::FromBeginning);
        assert_eq!(result.spec, Some(AudioSpec { sample_rate: 44_100, channels: 2 }));
        assert_frames_near(result.frames, 3 * RATE);
        assert_finished(&result.events);
        let duration = result.events.iter().find_map(|e| if let PipelineEvent::Ready { duration_ms } = e { Some(*duration_ms) } else { None }).unwrap();
        assert!(duration.abs_diff(3000) < 200, "duration {duration}");
    }

    #[test]
    fn seeks_progressive_mp3() {
        let result = run_and_drain(Box::new(Cursor::new(fixture("tone.mp3"))), Some("mp3"), StartMode::SeekMs(2000));
        assert_frames_near(result.frames, RATE);
    }

    #[test]
    fn decodes_hls_mp3_segments() {
        let (reader, _) = hls_reader("hls-mp3");
        let result = run_and_drain(Box::new(reader), Some("mp3"), StartMode::FromBeginning);
        assert_frames_near(result.frames, 3 * RATE);
        assert_finished(&result.events);
    }

    #[test]
    fn skips_into_hls_mp3_segment() {
        let (reader, _) = hls_reader("hls-mp3");
        let result = run_and_drain(Box::new(reader), Some("mp3"), StartMode::SkipMs(1500));
        assert_frames_near(result.frames, 3 * RATE / 2);
    }

    #[test]
    fn decodes_hls_fmp4_aac_with_init() {
        let (reader, has_init) = hls_reader("hls-aac");
        assert!(has_init);
        let result = run_and_drain(Box::new(reader), Some("mp4"), StartMode::FromBeginning);
        assert_frames_near(result.frames, 3 * RATE);
        assert_finished(&result.events);
    }

    #[test]
    fn decodes_hls_adts_aac() {
        let (reader, _) = hls_reader("hls-adts");
        let result = run_and_drain(Box::new(reader), Some("aac"), StartMode::FromBeginning);
        assert_frames_near(result.frames, 3 * RATE);
    }

    #[test]
    fn garbage_reports_failure() {
        let result = run_and_drain(Box::new(Cursor::new(vec![0u8; 4096])), None, StartMode::FromBeginning);
        assert!(result.events.iter().any(|e| matches!(e, PipelineEvent::DecoderFailed { .. })), "{:?}", result.events);
    }
}
