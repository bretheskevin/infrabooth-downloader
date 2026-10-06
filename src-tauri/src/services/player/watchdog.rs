use std::time::{Duration, Instant};

pub const LOADING_WATCHDOG: Duration = Duration::from_millis(5000);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WatchdogAction {
    None,
    RequestUrlRefresh,
    GiveUp,
}

#[derive(Debug, Default)]
pub struct LoadingWatchdog {
    armed_at: Option<Instant>,
    stage: u8,
}

impl LoadingWatchdog {
    pub fn arm(&mut self, now: Instant) {
        self.armed_at = Some(now);
    }

    pub fn clear(&mut self) {
        self.armed_at = None;
    }

    pub fn reset(&mut self) {
        self.armed_at = None;
        self.stage = 0;
    }

    #[cfg(test)]
    pub fn is_armed(&self) -> bool {
        self.armed_at.is_some()
    }

    pub fn poll(&mut self, now: Instant, is_loading: bool) -> WatchdogAction {
        let Some(armed_at) = self.armed_at else {
            return WatchdogAction::None;
        };
        if now.duration_since(armed_at) < LOADING_WATCHDOG {
            return WatchdogAction::None;
        }
        self.armed_at = None;
        if !is_loading {
            log::debug!("[player::watchdog] Fired but no longer loading; ignoring");
            return WatchdogAction::None;
        }
        if self.stage == 0 {
            self.stage = 1;
            self.armed_at = Some(now);
            log::warn!("[player::watchdog] Still loading after {:?}; requesting URL refresh", LOADING_WATCHDOG);
            return WatchdogAction::RequestUrlRefresh;
        }
        self.stage = 0;
        log::error!("[player::watchdog] Still loading after URL refresh; giving up");
        WatchdogAction::GiveUp
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_fire_requests_refresh_then_gives_up() {
        let t0 = Instant::now();
        let mut dog = LoadingWatchdog::default();
        dog.arm(t0);
        assert_eq!(dog.poll(t0 + Duration::from_millis(4999), true), WatchdogAction::None);
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG, true), WatchdogAction::RequestUrlRefresh);
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG * 2 - Duration::from_millis(1), true), WatchdogAction::None);
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG * 2, true), WatchdogAction::GiveUp);
        assert!(!dog.is_armed());
    }

    #[test]
    fn does_nothing_when_not_loading_at_fire_time() {
        let t0 = Instant::now();
        let mut dog = LoadingWatchdog::default();
        dog.arm(t0);
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG, false), WatchdogAction::None);
        assert!(!dog.is_armed());
    }

    #[test]
    fn reset_restarts_from_stage_zero() {
        let t0 = Instant::now();
        let mut dog = LoadingWatchdog::default();
        dog.arm(t0);
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG, true), WatchdogAction::RequestUrlRefresh);
        dog.reset();
        dog.arm(t0 + LOADING_WATCHDOG);
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG * 2, true), WatchdogAction::RequestUrlRefresh);
    }

    #[test]
    fn clear_disarms_without_resetting_stage() {
        let t0 = Instant::now();
        let mut dog = LoadingWatchdog::default();
        dog.arm(t0);
        dog.poll(t0 + LOADING_WATCHDOG, true);
        dog.clear();
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG * 3, true), WatchdogAction::None);
        dog.arm(t0 + LOADING_WATCHDOG * 3);
        assert_eq!(dog.poll(t0 + LOADING_WATCHDOG * 4, true), WatchdogAction::GiveUp);
    }
}
