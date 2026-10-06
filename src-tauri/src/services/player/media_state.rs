use std::time::Instant;

use super::emitter::PlayerEngineState;

pub const SEEK_JUMP_MS: u64 = 2000;
const DURATION_CHANGE_MS: u64 = 1000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaPlayback {
    Playing { position_ms: u64 },
    Paused { position_ms: u64 },
    Stopped,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaUpdate {
    Playback(MediaPlayback),
    Duration(u64),
}

#[derive(Debug)]
pub struct MediaStateTracker {
    state: PlayerEngineState,
    position_ms: u64,
    duration_ms: u64,
    position_at: Option<Instant>,
}

impl Default for MediaStateTracker {
    fn default() -> Self {
        Self { state: PlayerEngineState::Idle, position_ms: 0, duration_ms: 0, position_at: None }
    }
}

impl MediaStateTracker {
    pub fn on_state(&mut self, state: PlayerEngineState, now: Instant) -> Option<MediaUpdate> {
        if state == self.state {
            return None;
        }
        self.position_ms = self.expected_position(now);
        self.position_at = Some(now);
        self.state = state;
        Some(MediaUpdate::Playback(self.playback()))
    }

    pub fn on_progress(&mut self, position_ms: u64, duration_ms: u64, now: Instant) -> Vec<MediaUpdate> {
        let expected = self.expected_position(now);
        self.position_ms = position_ms;
        self.position_at = Some(now);
        let mut updates = Vec::new();
        if duration_ms > 0 && duration_ms.abs_diff(self.duration_ms) > DURATION_CHANGE_MS {
            self.duration_ms = duration_ms;
            updates.push(MediaUpdate::Duration(duration_ms));
        }
        if expected.abs_diff(position_ms) > SEEK_JUMP_MS {
            updates.push(MediaUpdate::Playback(self.playback()));
        }
        updates
    }

    pub fn reset_duration(&mut self, duration_ms: u64) {
        self.duration_ms = duration_ms;
    }

    fn expected_position(&self, now: Instant) -> u64 {
        match (self.state, self.position_at) {
            (PlayerEngineState::Playing, Some(at)) => self.position_ms + now.saturating_duration_since(at).as_millis() as u64,
            _ => self.position_ms,
        }
    }

    fn playback(&self) -> MediaPlayback {
        match self.state {
            PlayerEngineState::Playing | PlayerEngineState::Loading => MediaPlayback::Playing { position_ms: self.position_ms },
            PlayerEngineState::Paused => MediaPlayback::Paused { position_ms: self.position_ms },
            PlayerEngineState::Idle => MediaPlayback::Stopped,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn ms(t0: Instant, value: u64) -> Instant {
        t0 + Duration::from_millis(value)
    }

    #[test]
    fn state_changes_map_like_today() {
        let t0 = Instant::now();
        let mut tracker = MediaStateTracker::default();
        assert_eq!(tracker.on_state(PlayerEngineState::Loading, t0), Some(MediaUpdate::Playback(MediaPlayback::Playing { position_ms: 0 })));
        assert_eq!(tracker.on_state(PlayerEngineState::Loading, t0), None);
        assert_eq!(tracker.on_state(PlayerEngineState::Paused, t0), Some(MediaUpdate::Playback(MediaPlayback::Paused { position_ms: 0 })));
        assert_eq!(tracker.on_state(PlayerEngineState::Idle, t0), Some(MediaUpdate::Playback(MediaPlayback::Stopped)));
    }

    #[test]
    fn steady_progress_does_not_push_updates() {
        let t0 = Instant::now();
        let mut tracker = MediaStateTracker::default();
        tracker.reset_duration(180_000);
        tracker.on_state(PlayerEngineState::Playing, t0);
        assert!(tracker.on_progress(250, 180_000, ms(t0, 250)).is_empty());
        assert!(tracker.on_progress(1000, 180_000, ms(t0, 1000)).is_empty());
    }

    #[test]
    fn position_jump_over_two_seconds_pushes_playback() {
        let t0 = Instant::now();
        let mut tracker = MediaStateTracker::default();
        tracker.reset_duration(180_000);
        tracker.on_state(PlayerEngineState::Playing, t0);
        let updates = tracker.on_progress(60_000, 180_000, ms(t0, 250));
        assert_eq!(updates, vec![MediaUpdate::Playback(MediaPlayback::Playing { position_ms: 60_000 })]);
    }

    #[test]
    fn paused_position_does_not_advance() {
        let t0 = Instant::now();
        let mut tracker = MediaStateTracker::default();
        tracker.reset_duration(10_000);
        tracker.on_state(PlayerEngineState::Paused, t0);
        assert!(tracker.on_progress(0, 10_000, ms(t0, 30_000)).is_empty());
    }

    #[test]
    fn duration_change_pushes_duration() {
        let t0 = Instant::now();
        let mut tracker = MediaStateTracker::default();
        tracker.reset_duration(180_000);
        assert!(tracker.on_progress(0, 180_400, t0).is_empty());
        assert_eq!(tracker.on_progress(0, 200_000, t0), vec![MediaUpdate::Duration(200_000)]);
    }
}
