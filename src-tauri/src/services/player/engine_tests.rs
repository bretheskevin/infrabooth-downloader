use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use super::emitter::{PlayerEngineState as S, PlayerEvent, PlayerEventSink};
use super::engine::Engine;
use super::feed::{AudioSpec, Feed};
use super::messages::{EngineMsg, NetworkErrorKind, PipelineEvent, PipelineId};
use super::ports::{AudioOutput, Pipeline, PipelineFactory, PipelineRequest, SlotSink};
use crate::models::error::PlayerError;

type EventLog = Arc<Mutex<Vec<(u32, PlayerEvent)>>>;

struct RecordingSink(EventLog);
impl PlayerEventSink for RecordingSink {
    fn emit(&self, generation: u32, event: PlayerEvent) {
        self.0.lock().unwrap().push((generation, event));
    }
}

#[derive(Default, Debug)]
struct SinkState {
    playing: bool,
    volume: f32,
    dropped: bool,
}
type SinkHandle = Arc<Mutex<SinkState>>;

struct FakeSink(SinkHandle);
impl SlotSink for FakeSink {
    fn play(&self) {
        self.0.lock().unwrap().playing = true;
    }
    fn pause(&self) {
        self.0.lock().unwrap().playing = false;
    }
    fn set_volume(&self, volume: f32) {
        self.0.lock().unwrap().volume = volume;
    }
}
impl Drop for FakeSink {
    fn drop(&mut self) {
        self.0.lock().unwrap().dropped = true;
    }
}

struct FakeOutput {
    sinks: Arc<Mutex<Vec<SinkHandle>>>,
    open: Arc<AtomicBool>,
}
impl AudioOutput for FakeOutput {
    fn ensure_open(&mut self) -> Result<(), PlayerError> {
        self.open.store(true, Ordering::SeqCst);
        Ok(())
    }
    fn is_open(&self) -> bool {
        self.open.load(Ordering::SeqCst)
    }
    fn release(&mut self) {
        self.open.store(false, Ordering::SeqCst);
    }
    fn create_sink(&mut self, _feed: Arc<Feed>) -> Result<Box<dyn SlotSink>, PlayerError> {
        self.open.store(true, Ordering::SeqCst);
        let handle: SinkHandle = Arc::default();
        self.sinks.lock().unwrap().push(handle.clone());
        Ok(Box::new(FakeSink(handle)))
    }
    fn default_device_changed(&mut self) -> bool {
        false
    }
}

#[derive(Clone)]
struct Started {
    id: PipelineId,
    url: String,
    start_ms: u64,
    feed: Arc<Feed>,
    cancelled: Arc<AtomicBool>,
}

struct FakePipeline(Arc<AtomicBool>);
impl Pipeline for FakePipeline {
    fn cancel(&self) {
        self.0.store(true, Ordering::SeqCst);
    }
}

struct FakeFactory(Arc<Mutex<Vec<Started>>>);
impl PipelineFactory for FakeFactory {
    fn start(&self, request: PipelineRequest) -> Box<dyn Pipeline> {
        request.feed.set_spec(request.epoch, AudioSpec { sample_rate: 1000, channels: 1 });
        let cancelled = Arc::new(AtomicBool::new(false));
        self.0.lock().unwrap().push(Started { id: request.id, url: request.url, start_ms: request.start_ms, feed: request.feed, cancelled: cancelled.clone() });
        Box::new(FakePipeline(cancelled))
    }
}

struct Harness {
    engine: Engine,
    events: EventLog,
    sinks: Arc<Mutex<Vec<SinkHandle>>>,
    pipelines: Arc<Mutex<Vec<Started>>>,
    open: Arc<AtomicBool>,
    t0: Instant,
    _rx: Receiver<EngineMsg>,
}

impl Harness {
    fn new() -> Self {
        let events: EventLog = Arc::default();
        let sinks = Arc::new(Mutex::new(Vec::new()));
        let pipelines = Arc::new(Mutex::new(Vec::new()));
        let open = Arc::new(AtomicBool::new(false));
        let (tx, rx) = mpsc::channel();
        let engine = Engine::new(
            Box::new(RecordingSink(events.clone())),
            Box::new(FakeOutput { sinks: sinks.clone(), open: open.clone() }),
            Box::new(FakeFactory(pipelines.clone())),
            tx,
        );
        Self { engine, events, sinks, pipelines, open, t0: Instant::now(), _rx: rx }
    }
    fn at(&self, ms: u64) -> Instant {
        self.t0 + Duration::from_millis(ms)
    }
    fn send(&mut self, msg: EngineMsg, ms: u64) {
        let now = self.at(ms);
        self.engine.handle(msg, now);
    }
    fn tick(&mut self, ms: u64) {
        let now = self.at(ms);
        self.engine.tick(now);
    }
    fn load(&mut self, generation: u32, ms: u64) {
        self.send(EngineMsg::Load { url: format!("https://cdn.test/{generation}.m3u8"), start_ms: 0, generation }, ms);
    }
    fn pipeline(&self, index_from_end: usize) -> Started {
        let all = self.pipelines.lock().unwrap();
        all[all.len() - 1 - index_from_end].clone()
    }
    fn event(&mut self, id: PipelineId, event: PipelineEvent, ms: u64) {
        self.send(EngineMsg::Pipeline { pipeline_id: id, event }, ms);
    }
    fn ready_last(&mut self, ms: u64) {
        let id = self.pipeline(0).id;
        self.event(id, PipelineEvent::Ready { duration_ms: 10_000 }, ms);
    }
    fn take(&self) -> Vec<(u32, PlayerEvent)> {
        std::mem::take(&mut *self.events.lock().unwrap())
    }
    fn take_events(&self) -> Vec<PlayerEvent> {
        self.take().into_iter().map(|(_, e)| e).collect()
    }
    fn states(&self) -> Vec<S> {
        self.take_events().into_iter().filter_map(|e| if let PlayerEvent::StateChanged(s) = e { Some(s) } else { None }).collect()
    }
    fn sink(&self, index_from_end: usize) -> SinkHandle {
        let all = self.sinks.lock().unwrap();
        all[all.len() - 1 - index_from_end].clone()
    }
}

fn net(kind: NetworkErrorKind) -> PipelineEvent {
    PipelineEvent::NetworkError { kind, detail: "boom".into() }
}

#[test]
fn load_emits_loading_with_generation_and_starts_pipeline() {
    let mut h = Harness::new();
    h.load(4, 0);
    assert_eq!(h.take(), vec![(4, PlayerEvent::StateChanged(S::Loading))]);
    assert_eq!(h.pipeline(0).url, "https://cdn.test/4.m3u8");
    assert!(h.open.load(Ordering::SeqCst));
}

#[test]
fn play_before_ready_is_deferred_until_ready() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.take();
    assert!(h.sinks.lock().unwrap().is_empty());
    h.ready_last(10);
    assert_eq!(h.states(), vec![S::Playing]);
    assert!(h.sink(0).lock().unwrap().playing);
}

#[test]
fn play_after_ready_starts_immediately() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.ready_last(10);
    h.take();
    h.send(EngineMsg::Play, 20);
    assert_eq!(h.states(), vec![S::Playing]);
}

#[test]
fn pause_emits_paused_and_stops_progress() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    h.send(EngineMsg::Pause, 20);
    assert_eq!(h.states(), vec![S::Loading, S::Playing, S::Paused]);
    assert!(!h.sink(0).lock().unwrap().playing);
    h.tick(1000);
    assert!(h.take_events().iter().all(|e| !matches!(e, PlayerEvent::Progress { .. })));
}

#[test]
fn seek_while_playing_goes_loading_then_playing_and_ignores_stale_pipeline() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    let old = h.pipeline(0);
    h.take();
    h.send(EngineMsg::Seek { position_ms: 5000 }, 20);
    assert_eq!(h.states(), vec![S::Loading]);
    assert!(old.cancelled.load(Ordering::SeqCst));
    let new = h.pipeline(0);
    assert_eq!(new.start_ms, 5000);
    h.event(old.id, PipelineEvent::Ready { duration_ms: 1 }, 25);
    assert!(h.take().is_empty());
    h.ready_last(30);
    assert_eq!(h.states(), vec![S::Playing]);
}

#[test]
fn seek_while_paused_stays_paused() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    h.send(EngineMsg::Pause, 20);
    h.take();
    h.send(EngineMsg::Seek { position_ms: 3000 }, 30);
    h.ready_last(40);
    assert!(h.states().is_empty());
}

#[test]
fn watchdog_requests_url_refresh_then_gives_up() {
    let mut h = Harness::new();
    h.load(2, 0);
    h.take();
    h.tick(4999);
    assert!(h.take().is_empty());
    h.tick(5000);
    assert_eq!(h.take(), vec![(2, PlayerEvent::UrlExpired { position_ms: 0 })]);
    h.tick(10_000);
    assert_eq!(h.take_events(), vec![PlayerEvent::StateChanged(S::Idle), PlayerEvent::Error("Loading stalled after URL refresh".into())]);
}

#[test]
fn load_resets_watchdog_stage() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.tick(5000);
    h.load(2, 5001);
    h.take();
    h.tick(10_001);
    assert_eq!(h.take_events(), vec![PlayerEvent::UrlExpired { position_ms: 0 }]);
}

#[test]
fn non_fatal_errors_escalate_after_threshold_and_reset_on_segment() {
    let mut h = Harness::new();
    h.load(1, 0);
    let id = h.pipeline(0).id;
    h.take();
    h.event(id, net(NetworkErrorKind::NonFatal), 1);
    h.event(id, net(NetworkErrorKind::NonFatal), 2);
    h.event(id, PipelineEvent::SegmentLoaded, 3);
    h.event(id, net(NetworkErrorKind::NonFatal), 4);
    h.event(id, net(NetworkErrorKind::NonFatal), 5);
    assert!(h.take().is_empty());
    h.event(id, net(NetworkErrorKind::NonFatal), 6);
    assert_eq!(h.take_events(), vec![PlayerEvent::UrlExpired { position_ms: 0 }]);
}

#[test]
fn expired_requests_refresh_once_then_fails() {
    let mut h = Harness::new();
    h.load(1, 0);
    let id = h.pipeline(0).id;
    h.take();
    h.event(id, net(NetworkErrorKind::Expired), 1);
    assert_eq!(h.take_events(), vec![PlayerEvent::UrlExpired { position_ms: 0 }]);
    h.event(id, net(NetworkErrorKind::Fatal), 2);
    let events = h.take_events();
    assert_eq!(events[0], PlayerEvent::StateChanged(S::Idle));
    assert!(matches!(&events[1], PlayerEvent::Error(m) if m.starts_with("Network error")));
}

#[test]
fn progress_every_250ms_from_active_only() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    h.take();
    for ms in (50..=1000).step_by(50) {
        h.tick(ms);
    }
    let progress = h.take_events().into_iter().filter(|e| matches!(e, PlayerEvent::Progress { .. })).count();
    assert_eq!(progress, 4);
}

#[test]
fn drained_feed_emits_paused_then_ended() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    h.take();
    h.pipeline(0).feed.set_drained(true);
    h.tick(60);
    let events: Vec<_> = h.take_events().into_iter().filter(|e| !matches!(e, PlayerEvent::Progress { .. })).collect();
    assert_eq!(events, vec![PlayerEvent::StateChanged(S::Paused), PlayerEvent::Ended]);
}

#[test]
fn stop_resets_to_idle_with_new_generation() {
    let mut h = Harness::new();
    h.load(1, 0);
    let first = h.pipeline(0);
    h.take();
    h.send(EngineMsg::Stop { generation: 2 }, 10);
    assert_eq!(h.take(), vec![(2, PlayerEvent::StateChanged(S::Idle))]);
    assert!(first.cancelled.load(Ordering::SeqCst));
}

#[test]
fn set_volume_clamps_and_applies_to_active_sink() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.ready_last(10);
    h.send(EngineMsg::SetVolume { volume: 1.7 }, 20);
    assert_eq!(h.sink(0).lock().unwrap().volume, 1.0);
    h.send(EngineMsg::SetVolume { volume: -1.0 }, 30);
    assert_eq!(h.sink(0).lock().unwrap().volume, 0.0);
}

#[test]
fn fully_buffered_only_for_active() {
    let mut h = Harness::new();
    h.load(1, 0);
    let active = h.pipeline(0).id;
    h.send(EngineMsg::PreloadNext { url: "https://cdn.test/next.mp3".into() }, 1);
    let standby = h.pipeline(0).id;
    h.take();
    h.event(standby, PipelineEvent::FullyBuffered, 2);
    assert!(h.take().is_empty());
    h.event(active, PipelineEvent::FullyBuffered, 3);
    assert_eq!(h.take_events(), vec![PlayerEvent::FullyBuffered]);
}

fn playing_with_standby(h: &mut Harness) -> (Started, Started) {
    h.send(EngineMsg::SetVolume { volume: 0.5 }, 0);
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    let active = h.pipeline(0);
    h.send(EngineMsg::PreloadNext { url: "https://cdn.test/next.m3u8".into() }, 20);
    let standby = h.pipeline(0);
    h.take();
    (active, standby)
}

#[test]
fn crossfade_waits_for_standby_then_ramps_and_completes() {
    let mut h = Harness::new();
    let (active, standby) = playing_with_standby(&mut h);
    let outgoing_sink = h.sink(0);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    assert!(h.take().is_empty());
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 200);
    let incoming_sink = h.sink(0);
    assert!(incoming_sink.lock().unwrap().playing);
    assert_eq!(incoming_sink.lock().unwrap().volume, 0.0);
    assert_eq!(outgoing_sink.lock().unwrap().volume, 0.5);
    h.tick(700);
    let mid = incoming_sink.lock().unwrap().volume;
    assert!(mid > 0.0 && mid < 0.8);
    h.tick(1200);
    assert!((incoming_sink.lock().unwrap().volume - 0.8).abs() < 1e-6);
    assert!(h.take_events().contains(&PlayerEvent::CrossfadeComplete));
    assert!(active.cancelled.load(Ordering::SeqCst));
    assert!(outgoing_sink.lock().unwrap().dropped);
}

#[test]
fn set_volume_during_ramp_updates_target_only() {
    let mut h = Harness::new();
    let (_, standby) = playing_with_standby(&mut h);
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 30);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    let outgoing_sink = h.sink(1);
    h.send(EngineMsg::SetVolume { volume: 0.3 }, 150);
    assert_eq!(outgoing_sink.lock().unwrap().volume, 0.5);
    h.tick(1200);
    assert!((h.sink(0).lock().unwrap().volume - 0.3).abs() < 1e-6);
}

#[test]
fn cancel_mid_ramp_restores_outgoing() {
    let mut h = Harness::new();
    let (active, standby) = playing_with_standby(&mut h);
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 30);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    h.send(EngineMsg::CancelCrossfade, 300);
    assert!(standby.cancelled.load(Ordering::SeqCst));
    assert!(!active.cancelled.load(Ordering::SeqCst));
    h.take();
    h.tick(2000);
    assert!(!h.take_events().contains(&PlayerEvent::CrossfadeComplete));
}

#[test]
fn cancel_while_pending_drops_standby() {
    let mut h = Harness::new();
    let (_, standby) = playing_with_standby(&mut h);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    h.send(EngineMsg::CancelCrossfade, 150);
    assert!(standby.cancelled.load(Ordering::SeqCst));
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 200);
    assert!(h.take().is_empty());
}

#[test]
fn settle_snaps_volume_and_drops_outgoing() {
    let mut h = Harness::new();
    let (active, standby) = playing_with_standby(&mut h);
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 30);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    h.send(EngineMsg::SettleCrossfade, 200);
    assert!(active.cancelled.load(Ordering::SeqCst));
    assert!((h.sink(0).lock().unwrap().volume - 0.8).abs() < 1e-6);
    h.take();
    h.tick(2000);
    assert!(!h.take_events().contains(&PlayerEvent::CrossfadeComplete));
}

#[test]
fn start_crossfade_without_standby_is_noop() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.take();
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 1.0 }, 10);
    assert!(h.take().is_empty());
}

#[test]
fn output_released_after_idle_and_reopened_on_play() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    h.send(EngineMsg::Pause, 20);
    h.tick(100);
    h.tick(60_200);
    assert!(!h.open.load(Ordering::SeqCst));
    h.send(EngineMsg::Play, 60_300);
    assert!(h.open.load(Ordering::SeqCst));
    assert!(h.sink(0).lock().unwrap().playing);
}

#[test]
fn buffer_underrun_goes_loading_then_back_to_playing() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    h.take();
    let feed = h.pipeline(0).feed;
    feed.set_starved(true);
    h.tick(60);
    assert_eq!(h.states(), vec![S::Loading]);
    assert!(feed.push(feed.epoch(), &[0.0; 200]));
    h.tick(120);
    assert_eq!(h.states(), vec![S::Playing]);
}

#[test]
fn play_after_end_restarts_from_zero() {
    let mut h = Harness::new();
    h.load(1, 0);
    h.send(EngineMsg::Play, 1);
    h.ready_last(10);
    h.pipeline(0).feed.set_drained(true);
    h.tick(60);
    h.take();
    h.send(EngineMsg::Play, 100);
    assert_eq!(h.pipeline(0).start_ms, 0);
    assert!(h.pipeline(1).cancelled.load(Ordering::SeqCst));
    h.ready_last(150);
    assert_eq!(h.states(), vec![S::Playing]);
}

#[test]
fn standby_decode_failure_reports_error_and_drops_standby() {
    let mut h = Harness::new();
    let (active, standby) = playing_with_standby(&mut h);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    h.event(standby.id, PipelineEvent::DecoderFailed { message: "Decode error: bad".into() }, 150);
    assert_eq!(h.take_events(), vec![PlayerEvent::Error("Decode error: bad".into())]);
    assert!(standby.cancelled.load(Ordering::SeqCst));
    assert!(!active.cancelled.load(Ordering::SeqCst));
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 200);
    assert!(h.take().is_empty());
}

#[test]
fn end_while_crossfade_pending_drops_standby_and_reports_ended() {
    let mut h = Harness::new();
    let (active, standby) = playing_with_standby(&mut h);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    active.feed.set_drained(true);
    h.tick(150);
    let events: Vec<_> = h.take_events().into_iter().filter(|e| !matches!(e, PlayerEvent::Progress { .. })).collect();
    assert_eq!(events, vec![PlayerEvent::StateChanged(S::Paused), PlayerEvent::Ended]);
    assert!(standby.cancelled.load(Ordering::SeqCst));
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 200);
    assert!(h.take().is_empty());
}

#[test]
fn incoming_end_during_ramp_is_not_reported() {
    let mut h = Harness::new();
    let (_, standby) = playing_with_standby(&mut h);
    h.event(standby.id, PipelineEvent::Ready { duration_ms: 9000 }, 30);
    h.send(EngineMsg::StartCrossfade { duration_ms: 1000, target_volume: 0.8 }, 100);
    h.take();
    standby.feed.set_drained(true);
    h.tick(150);
    assert!(!h.take_events().contains(&PlayerEvent::Ended));
    h.tick(1200);
    assert!(h.take_events().contains(&PlayerEvent::CrossfadeComplete));
}
