use std::sync::mpsc::Sender;
use std::sync::Arc;
use std::time::{Duration, Instant};

use super::crossfade::Crossfade;
use super::emitter::{PlayerEngineState, PlayerEvent, PlayerEventSink};
use super::feed::{Feed, READY_BUFFER_MS};
use super::messages::{EngineMsg, NetworkErrorKind, PipelineEvent, PipelineId};
use super::ports::{AudioOutput, Pipeline, PipelineFactory, PipelineRequest, SlotSink};
use super::url_prefix;
use super::watchdog::{LoadingWatchdog, WatchdogAction, LOADING_WATCHDOG};

pub const TICK: Duration = Duration::from_millis(50);
pub const NON_FATAL_THRESHOLD: u32 = 3;
const PROGRESS_INTERVAL: Duration = Duration::from_millis(250);
const OUTPUT_IDLE_RELEASE: Duration = Duration::from_secs(60);
const DEVICE_CHECK_INTERVAL: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Role {
    Active,
    Standby,
}

pub struct Slot {
    pub(super) pipeline_id: PipelineId,
    pipeline: Box<dyn Pipeline>,
    pub(super) url: String,
    pub(super) feed: Arc<Feed>,
    pub(super) sink: Option<Box<dyn SlotSink>>,
    pub(super) ready: bool,
    pub(super) playing: bool,
    pub(super) volume: f32,
    pub(super) duration_ms: u64,
    pub(super) progress_active: bool,
    pub(super) ended: bool,
    pub(super) fully_buffered: bool,
    pub(super) is_outgoing: bool,
}

impl Slot {
    pub(super) fn set_volume(&mut self, volume: f32) {
        self.volume = volume;
        if let Some(sink) = &self.sink {
            sink.set_volume(volume);
        }
    }

    pub(super) fn set_playing(&mut self, playing: bool) {
        self.playing = playing;
        if let Some(sink) = &self.sink {
            if playing {
                sink.play();
            } else {
                sink.pause();
            }
        }
    }

    pub(super) fn position_ms(&self) -> u64 {
        let position = self.feed.position_ms();
        if self.duration_ms > 0 {
            position.min(self.duration_ms)
        } else {
            position
        }
    }
}

impl Drop for Slot {
    fn drop(&mut self) {
        self.pipeline.cancel();
        self.feed.close();
    }
}

pub(super) fn attach_sink(slot: &mut Slot, output: &mut dyn AudioOutput) -> Result<(), String> {
    if slot.sink.is_some() {
        return Ok(());
    }
    let sink = output.create_sink(slot.feed.clone()).map_err(|e| e.to_string())?;
    sink.set_volume(slot.volume);
    if slot.playing {
        sink.play();
    } else {
        sink.pause();
    }
    slot.sink = Some(sink);
    Ok(())
}

pub struct Engine {
    events: Box<dyn PlayerEventSink>,
    pub(super) output: Box<dyn AudioOutput>,
    pipelines: Box<dyn PipelineFactory>,
    notify: Sender<EngineMsg>,
    pub(super) active: Option<Slot>,
    pub(super) standby: Option<Slot>,
    pub(super) state: PlayerEngineState,
    generation: u32,
    pub(super) volume: f32,
    pub(super) ramp_target: f32,
    pub(super) crossfade: Crossfade,
    play_when_ready: bool,
    url_refresh_attempted: bool,
    non_fatal_errors: u32,
    watchdog: LoadingWatchdog,
    last_progress_at: Option<Instant>,
    idle_since: Option<Instant>,
    last_device_check: Option<Instant>,
}

impl Engine {
    pub fn new(events: Box<dyn PlayerEventSink>, output: Box<dyn AudioOutput>, pipelines: Box<dyn PipelineFactory>, notify: Sender<EngineMsg>) -> Self {
        Self {
            events,
            output,
            pipelines,
            notify,
            active: None,
            standby: None,
            state: PlayerEngineState::Idle,
            generation: 0,
            volume: 1.0,
            ramp_target: 1.0,
            crossfade: Crossfade::Idle,
            play_when_ready: false,
            url_refresh_attempted: false,
            non_fatal_errors: 0,
            watchdog: LoadingWatchdog::default(),
            last_progress_at: None,
            idle_since: None,
            last_device_check: None,
        }
    }

    pub fn handle(&mut self, msg: EngineMsg, now: Instant) {
        match msg {
            EngineMsg::Load { url, start_ms, generation } => self.load(url, start_ms, generation, now),
            EngineMsg::Play => self.play(now),
            EngineMsg::Pause => self.pause(now),
            EngineMsg::Seek { position_ms } => self.seek(position_ms, now),
            EngineMsg::SetVolume { volume } => self.set_volume(volume),
            EngineMsg::Stop { generation } => self.stop(generation, now),
            EngineMsg::Destroy { generation } => self.destroy(generation, now),
            EngineMsg::PreloadNext { url } => self.preload_next(url),
            EngineMsg::StartCrossfade { duration_ms, target_volume } => self.start_crossfade(duration_ms, target_volume, now),
            EngineMsg::CancelCrossfade => self.cancel_crossfade(),
            EngineMsg::SettleCrossfade => self.settle_crossfade(),
            EngineMsg::Pipeline { pipeline_id, event } => self.on_pipeline_event(pipeline_id, event, now),
            EngineMsg::PreloadSegments { .. } | EngineMsg::PurgeCache { .. } => {
                log::warn!("[player::engine] Cache message reached the engine; the runner should intercept it");
            }
        }
    }

    pub fn tick(&mut self, now: Instant) {
        self.tick_ramp(now);
        self.tick_buffering(now);
        self.tick_ended(now);
        self.tick_watchdog(now);
        self.tick_progress(now);
        self.tick_output(now);
    }

    pub fn recover_from_panic(&mut self, now: Instant) {
        self.crossfade = Crossfade::Idle;
        self.standby = None;
        self.active = None;
        self.watchdog.reset();
        self.play_when_ready = false;
        self.set_state(PlayerEngineState::Idle, now);
        self.emit(PlayerEvent::Error("Audio engine error".into()));
    }

    pub(super) fn emit(&self, event: PlayerEvent) {
        self.events.emit(self.generation, event);
    }

    pub(super) fn set_state(&mut self, state: PlayerEngineState, now: Instant) {
        if state != self.state {
            log::info!("[player::engine] State {:?} -> {:?} (gen={})", self.state, state, self.generation);
        }
        self.state = state;
        if state == PlayerEngineState::Loading {
            self.watchdog.arm(now);
        } else {
            self.watchdog.clear();
        }
        self.emit(PlayerEvent::StateChanged(state));
    }

    fn load(&mut self, url: String, start_ms: u64, generation: u32, now: Instant) {
        log::info!("[player::engine] Load gen={} start={}ms url={}", generation, start_ms, url_prefix(&url));
        self.generation = generation;
        self.play_when_ready = false;
        self.url_refresh_attempted = false;
        self.non_fatal_errors = 0;
        self.watchdog.reset();
        self.crossfade = Crossfade::Idle;
        self.standby = None;
        self.active = None;
        self.set_state(PlayerEngineState::Loading, now);
        self.active = Some(self.spawn_slot(url, start_ms));
    }

    fn spawn_slot(&mut self, url: String, start_ms: u64) -> Slot {
        let feed = Feed::new(start_ms);
        let pipeline_id = PipelineId::next();
        let request = PipelineRequest { id: pipeline_id, url: url.clone(), start_ms, feed: feed.clone(), epoch: feed.epoch(), notify: self.notify.clone() };
        let pipeline = self.pipelines.start(request);
        if let Err(e) = self.output.ensure_open() {
            log::warn!("[player::engine] Output not available yet (will retry on play): {}", e);
        }
        Slot {
            pipeline_id,
            pipeline,
            url,
            feed,
            sink: None,
            ready: false,
            playing: false,
            volume: self.volume,
            duration_ms: 0,
            progress_active: false,
            ended: false,
            fully_buffered: false,
            is_outgoing: false,
        }
    }

    fn restart_active(&mut self, position_ms: u64) {
        let Some(slot) = self.active.as_mut() else { return };
        slot.pipeline.cancel();
        slot.sink = None;
        let epoch = slot.feed.reset(position_ms);
        slot.pipeline_id = PipelineId::next();
        let request =
            PipelineRequest { id: slot.pipeline_id, url: slot.url.clone(), start_ms: position_ms, feed: slot.feed.clone(), epoch, notify: self.notify.clone() };
        slot.pipeline = self.pipelines.start(request);
        slot.ready = false;
        slot.ended = false;
    }

    fn play(&mut self, now: Instant) {
        let Some(slot) = self.active.as_ref() else {
            self.play_when_ready = true;
            log::info!("[player::engine] Play with nothing loaded; deferring");
            return;
        };
        if slot.ended {
            log::info!("[player::engine] Play after end; restarting from 0");
            self.play_when_ready = true;
            self.restart_active(0);
            return;
        }
        if !slot.ready {
            self.play_when_ready = true;
            log::info!("[player::engine] Media not ready; deferring play until ready");
            return;
        }
        self.play_when_ready = false;
        log::info!("[player::engine] Play (media ready, state={:?})", self.state);
        self.start_playback(now);
    }

    fn start_playback(&mut self, now: Instant) {
        if let Err(message) = self.attach_active_sink() {
            self.fail_active(format!("Play failed: {message}"), now);
            return;
        }
        let Some(slot) = self.active.as_mut() else { return };
        slot.set_playing(true);
        slot.progress_active = true;
        self.idle_since = None;
        self.set_state(PlayerEngineState::Playing, now);
    }

    fn attach_active_sink(&mut self) -> Result<(), String> {
        match self.active.as_mut() {
            Some(slot) => attach_sink(slot, self.output.as_mut()),
            None => Ok(()),
        }
    }

    fn pause(&mut self, now: Instant) {
        self.play_when_ready = false;
        let Some(slot) = self.active.as_mut() else {
            log::debug!("[player::engine] Pause with nothing loaded; ignoring");
            return;
        };
        if !slot.playing {
            log::debug!("[player::engine] Pause while not playing (state={:?}); deferred play cancelled", self.state);
            return;
        }
        log::info!("[player::engine] Pause at {}ms", slot.position_ms());
        slot.set_playing(false);
        slot.progress_active = false;
        if self.state != PlayerEngineState::Idle {
            self.set_state(PlayerEngineState::Paused, now);
        }
    }

    fn seek(&mut self, position_ms: u64, now: Instant) {
        if self.active.is_none() {
            return;
        }
        log::info!("[player::engine] Seek to {}ms (state={:?})", position_ms, self.state);
        if self.state == PlayerEngineState::Playing {
            self.set_state(PlayerEngineState::Loading, now);
        }
        self.restart_active(position_ms);
    }

    fn set_volume(&mut self, volume: f32) {
        if !volume.is_finite() {
            log::warn!("[player::engine] Ignoring non-finite volume");
            return;
        }
        let clamped = volume.clamp(0.0, 1.0);
        log::debug!("[player::engine] Set volume {:.2} (crossfade={:?})", clamped, self.crossfade);
        if matches!(self.crossfade, Crossfade::Ramping { .. }) {
            self.ramp_target = clamped;
            return;
        }
        self.volume = clamped;
        if let Some(slot) = self.active.as_mut() {
            slot.set_volume(clamped);
        }
    }

    fn stop(&mut self, generation: u32, now: Instant) {
        log::info!("[player::engine] Stop gen={}", generation);
        self.generation = generation;
        self.play_when_ready = false;
        self.cancel_crossfade();
        self.watchdog.reset();
        self.active = None;
        self.set_state(PlayerEngineState::Idle, now);
    }

    fn destroy(&mut self, generation: u32, now: Instant) {
        log::info!("[player::engine] Destroy gen={}", generation);
        self.generation = generation;
        self.play_when_ready = false;
        self.url_refresh_attempted = false;
        self.non_fatal_errors = 0;
        self.watchdog.reset();
        self.crossfade = Crossfade::Idle;
        self.standby = None;
        self.active = None;
        self.set_state(PlayerEngineState::Idle, now);
    }

    fn preload_next(&mut self, url: String) {
        log::info!("[player::engine] Preloading next into standby: {}", url_prefix(&url));
        self.standby = None;
        self.standby = Some(self.spawn_slot(url, 0));
    }

    fn role_of(&self, id: PipelineId) -> Option<Role> {
        if self.active.as_ref().is_some_and(|s| s.pipeline_id == id) {
            return Some(Role::Active);
        }
        if self.standby.as_ref().is_some_and(|s| s.pipeline_id == id) {
            return Some(Role::Standby);
        }
        None
    }

    fn slot_mut(&mut self, role: Role) -> Option<&mut Slot> {
        match role {
            Role::Active => self.active.as_mut(),
            Role::Standby => self.standby.as_mut(),
        }
    }

    fn on_pipeline_event(&mut self, id: PipelineId, event: PipelineEvent, now: Instant) {
        let Some(role) = self.role_of(id) else {
            log::debug!("[player::engine] Ignoring event from stale pipeline {}", id.0);
            return;
        };
        match event {
            PipelineEvent::Ready { duration_ms } => self.on_ready(role, duration_ms, now),
            PipelineEvent::SegmentLoaded => self.non_fatal_errors = 0,
            PipelineEvent::FullyBuffered => self.on_fully_buffered(role),
            PipelineEvent::NetworkError { kind, detail } => self.on_network_error(role, kind, detail, now),
            PipelineEvent::DecoderFinished => log::debug!("[player::engine] {:?} decoder finished", role),
            PipelineEvent::DecoderFailed { message } => self.on_decoder_failed(role, message, now),
        }
    }

    fn on_ready(&mut self, role: Role, duration_ms: u64, now: Instant) {
        let Some(slot) = self.slot_mut(role) else { return };
        slot.ready = true;
        slot.duration_ms = duration_ms;
        log::info!("[player::engine] {:?} slot ready (duration={}ms, buffered={}ms)", role, duration_ms, slot.feed.buffered_ms());
        match role {
            Role::Active => self.on_active_ready(now),
            Role::Standby => self.on_standby_ready(now),
        }
    }

    fn on_active_ready(&mut self, now: Instant) {
        if let Err(message) = self.attach_active_sink() {
            self.fail_active(format!("Audio output failed: {message}"), now);
            return;
        }
        let Some(slot) = self.active.as_mut() else { return };
        slot.progress_active = true;
        if slot.playing {
            if self.state == PlayerEngineState::Loading {
                self.set_state(PlayerEngineState::Playing, now);
            }
            return;
        }
        if self.play_when_ready {
            self.play_when_ready = false;
            log::info!("[player::engine] Deferred play executing");
            self.start_playback(now);
        }
    }

    fn on_standby_ready(&mut self, now: Instant) {
        if let Some(slot) = self.standby.as_mut() {
            if let Err(message) = attach_sink(slot, self.output.as_mut()) {
                log::warn!("[player::engine] Standby sink attach failed: {}", message);
            }
        }
        if let Crossfade::Pending { duration_ms, target } = self.crossfade {
            self.begin_crossfade(duration_ms, target, now);
        }
    }

    fn on_fully_buffered(&mut self, role: Role) {
        let Some(slot) = self.slot_mut(role) else { return };
        slot.fully_buffered = true;
        if role != Role::Active {
            log::debug!("[player::engine] Standby fully buffered");
            return;
        }
        log::info!("[player::engine] Active track fully buffered");
        self.emit(PlayerEvent::FullyBuffered);
    }

    fn on_network_error(&mut self, role: Role, kind: NetworkErrorKind, detail: String, now: Instant) {
        if kind == NetworkErrorKind::NonFatal {
            self.non_fatal_errors += 1;
            log::info!("[player::engine] Non-fatal network error ({}), consecutive={}", detail, self.non_fatal_errors);
            if self.non_fatal_errors < NON_FATAL_THRESHOLD {
                return;
            }
            self.non_fatal_errors = 0;
        }
        if role != Role::Active {
            log::warn!("[player::engine] Fatal network error on standby ignored: {}", detail);
            return;
        }
        self.on_fatal_network_error(detail, now);
    }

    fn on_fatal_network_error(&mut self, detail: String, now: Instant) {
        if self.url_refresh_attempted {
            self.fail_active(format!("Network error: {detail}"), now);
            return;
        }
        self.url_refresh_attempted = true;
        let position_ms = self.active.as_mut().map_or(0, |slot| {
            slot.progress_active = false;
            slot.position_ms()
        });
        log::info!("[player::engine] Fatal network error ({}); requesting URL refresh at {}ms", detail, position_ms);
        self.emit(PlayerEvent::UrlExpired { position_ms });
    }

    fn on_decoder_failed(&mut self, role: Role, message: String, now: Instant) {
        if role == Role::Active {
            self.fail_active(message, now);
            return;
        }
        if self.standby.as_ref().is_some_and(|s| s.is_outgoing) {
            log::warn!("[player::engine] Outgoing track decode failed during crossfade: {}", message);
            return;
        }
        log::error!("[player::engine] Standby decode failed: {}", message);
        if matches!(self.crossfade, Crossfade::Pending { .. }) {
            self.crossfade = Crossfade::Idle;
        }
        self.standby = None;
        self.emit(PlayerEvent::Error(message));
    }

    pub(super) fn fail_active(&mut self, message: String, now: Instant) {
        log::error!("[player::engine] Active playback failed: {}", message);
        self.crossfade = Crossfade::Idle;
        self.standby = None;
        self.active = None;
        self.set_state(PlayerEngineState::Idle, now);
        self.emit(PlayerEvent::Error(message));
    }

    fn tick_buffering(&mut self, now: Instant) {
        let Some(slot) = self.active.as_ref() else { return };
        if !slot.ready || !slot.playing || slot.ended {
            return;
        }
        let starved = slot.feed.is_starved() && !slot.feed.is_finished() && slot.feed.buffered_ms() < READY_BUFFER_MS;
        match self.state {
            PlayerEngineState::Playing if starved => {
                log::info!("[player::engine] Buffer underrun; waiting for data");
                self.set_state(PlayerEngineState::Loading, now);
            }
            PlayerEngineState::Loading if !starved => self.set_state(PlayerEngineState::Playing, now),
            _ => {}
        }
    }

    fn tick_ended(&mut self, now: Instant) {
        let Some(slot) = self.active.as_mut() else { return };
        if slot.ended || !slot.feed.is_drained() {
            return;
        }
        slot.ended = true;
        slot.progress_active = false;
        let was_playing = slot.playing;
        slot.set_playing(false);
        log::info!("[player::engine] Playback reached end ({}ms / {}ms)", slot.position_ms(), slot.duration_ms);
        if was_playing && self.state != PlayerEngineState::Idle {
            self.set_state(PlayerEngineState::Paused, now);
        }
        match self.crossfade {
            Crossfade::Ramping { .. } => {
                log::info!("[player::engine] Incoming track ended during crossfade ramp; Ended not reported");
                return;
            }
            Crossfade::Pending { .. } => {
                log::info!("[player::engine] Track ended before the standby was ready; dropping pending crossfade");
                self.crossfade = Crossfade::Idle;
                self.standby = None;
            }
            Crossfade::Idle => {}
        }
        self.emit(PlayerEvent::Ended);
    }

    fn tick_watchdog(&mut self, now: Instant) {
        match self.watchdog.poll(now, self.state == PlayerEngineState::Loading) {
            WatchdogAction::None => {}
            WatchdogAction::RequestUrlRefresh => {
                let position_ms = self.active.as_ref().map_or(0, Slot::position_ms);
                log::warn!("[player::watchdog] Loading stalled for {}ms at {}ms; requesting URL refresh", LOADING_WATCHDOG.as_millis(), position_ms);
                self.emit(PlayerEvent::UrlExpired { position_ms });
            }
            WatchdogAction::GiveUp => {
                log::error!("[player::watchdog] Loading still stalled after URL refresh; giving up");
                if let Some(slot) = self.active.as_mut() {
                    slot.progress_active = false;
                }
                self.set_state(PlayerEngineState::Idle, now);
                self.emit(PlayerEvent::Error("Loading stalled after URL refresh".into()));
            }
        }
    }

    fn tick_progress(&mut self, now: Instant) {
        if self.last_progress_at.is_some_and(|at| now.duration_since(at) < PROGRESS_INTERVAL) {
            return;
        }
        let Some(slot) = self.active.as_ref() else { return };
        if !slot.progress_active || slot.is_outgoing {
            return;
        }
        let event = PlayerEvent::Progress { position_ms: slot.position_ms(), duration_ms: slot.duration_ms };
        self.last_progress_at = Some(now);
        self.emit(event);
    }

    fn tick_output(&mut self, now: Instant) {
        if !self.output.is_open() {
            return;
        }
        let any_playing = self.active.as_ref().is_some_and(|s| s.playing) || self.standby.as_ref().is_some_and(|s| s.playing);
        if any_playing {
            self.idle_since = None;
            self.check_device(now);
            return;
        }
        let since = *self.idle_since.get_or_insert(now);
        if now.duration_since(since) < OUTPUT_IDLE_RELEASE {
            return;
        }
        log::info!("[player::output] Releasing idle output stream after {}s", OUTPUT_IDLE_RELEASE.as_secs());
        self.drop_sinks();
        self.output.release();
        self.idle_since = None;
    }

    fn check_device(&mut self, now: Instant) {
        if self.last_device_check.is_some_and(|at| now.duration_since(at) < DEVICE_CHECK_INTERVAL) {
            return;
        }
        self.last_device_check = Some(now);
        if self.output.default_device_changed() {
            self.reopen_output(now);
        }
    }

    fn reopen_output(&mut self, now: Instant) {
        self.drop_sinks();
        self.output.release();
        if let Err(e) = self.output.ensure_open() {
            self.fail_active(format!("Audio output failed: {e}"), now);
            return;
        }
        for slot in [self.active.as_mut(), self.standby.as_mut()].into_iter().flatten().filter(|s| s.ready) {
            if let Err(message) = attach_sink(slot, self.output.as_mut()) {
                log::error!("[player::output] Re-attaching sink after device change failed: {}", message);
            }
        }
    }

    fn drop_sinks(&mut self) {
        for slot in [self.active.as_mut(), self.standby.as_mut()].into_iter().flatten() {
            slot.sink = None;
        }
    }
}
