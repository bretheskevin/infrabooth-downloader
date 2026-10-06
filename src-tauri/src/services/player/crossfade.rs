use std::f64::consts::FRAC_PI_2;
use std::time::{Duration, Instant};

use super::emitter::{PlayerEngineState, PlayerEvent};
use super::engine::{attach_sink, Engine};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Crossfade {
    Idle,
    Pending { duration_ms: u64, target: f32 },
    Ramping { started_at: Instant, duration_ms: u64 },
}

pub fn fade_in_volume(elapsed: Duration, duration_ms: u64, target: f32) -> (f32, bool) {
    let progress = if duration_ms == 0 { 1.0 } else { (elapsed.as_secs_f64() * 1000.0 / duration_ms as f64).min(1.0) };
    let volume = target * (progress * FRAC_PI_2).sin() as f32;
    (volume, progress >= 1.0)
}

impl Engine {
    pub(super) fn start_crossfade(&mut self, duration_ms: u64, target: f32, now: Instant) {
        let Some(standby) = self.standby.as_ref() else {
            log::debug!("[player::crossfade] No standby; ignoring start");
            return;
        };
        let target = if target.is_finite() { target.clamp(0.0, 1.0) } else { self.volume };
        log::info!("[player::crossfade] Start requested (duration={}ms, target={:.2}, standby_ready={})", duration_ms, target, standby.ready);
        if standby.ready {
            self.begin_crossfade(duration_ms, target, now);
            return;
        }
        self.crossfade = Crossfade::Pending { duration_ms, target };
    }

    pub(super) fn begin_crossfade(&mut self, duration_ms: u64, target: f32, now: Instant) {
        let Some(mut incoming) = self.standby.take() else {
            self.crossfade = Crossfade::Idle;
            return;
        };
        incoming.set_volume(0.0);
        if let Err(message) = attach_sink(&mut incoming, self.output.as_mut()) {
            log::error!("[player::crossfade] Incoming sink failed: {}", message);
            self.crossfade = Crossfade::Idle;
            self.emit(PlayerEvent::Error(format!("Crossfade play failed: {message}")));
            return;
        }
        if let Some(outgoing) = self.active.as_mut() {
            outgoing.is_outgoing = true;
            outgoing.progress_active = false;
        }
        incoming.set_playing(true);
        incoming.progress_active = true;
        let incoming_fully_buffered = incoming.fully_buffered;
        self.standby = self.active.take();
        self.active = Some(incoming);
        self.ramp_target = target;
        self.crossfade = Crossfade::Ramping { started_at: now, duration_ms };
        log::info!("[player::crossfade] Begin (duration={}ms, target={:.2})", duration_ms, target);
        self.set_state(PlayerEngineState::Playing, now);
        if incoming_fully_buffered {
            self.emit(PlayerEvent::FullyBuffered);
        }
        self.tick_ramp(now);
    }

    pub(super) fn tick_ramp(&mut self, now: Instant) {
        let Crossfade::Ramping { started_at, duration_ms } = self.crossfade else { return };
        let (volume, done) = fade_in_volume(now.duration_since(started_at), duration_ms, self.ramp_target);
        if let Some(active) = self.active.as_mut() {
            active.set_volume(volume);
        }
        if !done {
            return;
        }
        self.crossfade = Crossfade::Idle;
        self.standby = None;
        self.volume = self.ramp_target;
        log::info!("[player::crossfade] Complete");
        self.emit(PlayerEvent::CrossfadeComplete);
    }

    pub(super) fn cancel_crossfade(&mut self) {
        match self.crossfade {
            Crossfade::Idle => return,
            Crossfade::Pending { .. } => {
                log::info!("[player::crossfade] Cancelled before begin");
                self.crossfade = Crossfade::Idle;
                self.standby = None;
                return;
            }
            Crossfade::Ramping { .. } => {}
        }
        self.crossfade = Crossfade::Idle;
        let Some(mut outgoing) = self.standby.take().filter(|s| s.is_outgoing) else { return };
        log::info!("[player::crossfade] Cancelled mid-ramp; restoring outgoing track");
        outgoing.is_outgoing = false;
        outgoing.progress_active = true;
        self.active = Some(outgoing);
    }

    pub(super) fn settle_crossfade(&mut self) {
        let ramping = matches!(self.crossfade, Crossfade::Ramping { .. });
        self.crossfade = Crossfade::Idle;
        self.standby = None;
        if !ramping {
            return;
        }
        if let Some(active) = self.active.as_mut() {
            active.set_volume(self.ramp_target);
        }
        self.volume = self.ramp_target;
        log::info!("[player::crossfade] Settled at volume {:.2}", self.ramp_target);
    }
}

#[cfg(test)]
mod math_tests {
    use super::*;

    #[test]
    fn fade_in_follows_sine_curve() {
        let (start, done) = fade_in_volume(Duration::ZERO, 1000, 0.8);
        assert_eq!(start, 0.0);
        assert!(!done);
        let (mid, _) = fade_in_volume(Duration::from_millis(500), 1000, 0.8);
        assert!((mid - 0.8 * (std::f64::consts::FRAC_PI_4.sin() as f32)).abs() < 1e-6);
        let (end, done) = fade_in_volume(Duration::from_millis(1500), 1000, 0.8);
        assert!((end - 0.8).abs() < 1e-6);
        assert!(done);
    }

    #[test]
    fn zero_duration_completes_immediately() {
        let (volume, done) = fade_in_volume(Duration::ZERO, 0, 0.5);
        assert!((volume - 0.5).abs() < 1e-6);
        assert!(done);
    }
}
