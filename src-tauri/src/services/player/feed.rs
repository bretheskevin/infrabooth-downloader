use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::Duration;

pub const READY_BUFFER_MS: u64 = 100;
pub const MAX_BUFFER_MS: u64 = 2000;
const DEFAULT_SPEC: AudioSpec = AudioSpec { sample_rate: 48_000, channels: 2 };
const PUSH_WAIT: Duration = Duration::from_millis(50);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AudioSpec {
    pub sample_rate: u32,
    pub channels: u16,
}

impl AudioSpec {
    pub fn samples_for_ms(&self, ms: u64) -> usize {
        (self.sample_rate as u64 * self.channels.max(1) as u64 * ms / 1000) as usize
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PopResult {
    Data,
    Starved,
    Drained,
    Stale,
}

#[derive(Debug)]
struct FeedInner {
    samples: VecDeque<f32>,
    spec: Option<AudioSpec>,
    finished: bool,
    closed: bool,
    epoch: u64,
    seek_base_ms: u64,
}

#[derive(Debug)]
pub struct Feed {
    inner: Mutex<FeedInner>,
    space: Condvar,
    frames_played: AtomicU64,
    starved: AtomicBool,
    drained: AtomicBool,
}

impl Feed {
    pub fn new(seek_base_ms: u64) -> Arc<Self> {
        Arc::new(Self {
            inner: Mutex::new(FeedInner { samples: VecDeque::new(), spec: None, finished: false, closed: false, epoch: 0, seek_base_ms }),
            space: Condvar::new(),
            frames_played: AtomicU64::new(0),
            starved: AtomicBool::new(false),
            drained: AtomicBool::new(false),
        })
    }

    fn lock(&self) -> MutexGuard<'_, FeedInner> {
        self.inner.lock().unwrap_or_else(|p| p.into_inner())
    }

    pub fn epoch(&self) -> u64 {
        self.lock().epoch
    }

    pub fn reset(&self, seek_base_ms: u64) -> u64 {
        let mut inner = self.lock();
        inner.epoch += 1;
        inner.samples.clear();
        inner.finished = false;
        inner.seek_base_ms = seek_base_ms;
        self.frames_played.store(0, Ordering::SeqCst);
        self.starved.store(false, Ordering::SeqCst);
        self.drained.store(false, Ordering::SeqCst);
        self.space.notify_all();
        log::debug!("[player::feed] reset epoch={} seek_base_ms={seek_base_ms}", inner.epoch);
        inner.epoch
    }

    pub fn close(&self) {
        let mut inner = self.lock();
        inner.closed = true;
        inner.epoch += 1;
        inner.samples.clear();
        self.space.notify_all();
        log::debug!("[player::feed] closed");
    }

    pub fn set_spec(&self, epoch: u64, spec: AudioSpec) -> bool {
        let mut inner = self.lock();
        if inner.closed || inner.epoch != epoch {
            log::debug!("[player::feed] set_spec ignored (stale epoch {epoch} or closed)");
            return false;
        }
        inner.spec = Some(spec);
        true
    }

    pub fn set_seek_base(&self, epoch: u64, seek_base_ms: u64) {
        let mut inner = self.lock();
        if inner.epoch == epoch {
            inner.seek_base_ms = seek_base_ms;
        }
    }

    pub fn push(&self, epoch: u64, samples: &[f32]) -> bool {
        let mut inner = self.lock();
        loop {
            if inner.closed || inner.epoch != epoch {
                return false;
            }
            let capacity = inner.spec.unwrap_or(DEFAULT_SPEC).samples_for_ms(MAX_BUFFER_MS);
            if inner.samples.len() < capacity {
                break;
            }
            inner = match self.space.wait_timeout(inner, PUSH_WAIT) {
                Ok((guard, _)) => guard,
                Err(poisoned) => poisoned.into_inner().0,
            };
        }
        inner.samples.extend(samples.iter().copied());
        true
    }

    pub fn finish(&self, epoch: u64) {
        let mut inner = self.lock();
        if inner.epoch == epoch {
            inner.finished = true;
            log::debug!("[player::feed] finished epoch={epoch} buffered_samples={}", inner.samples.len());
        }
    }

    pub fn pop_into(&self, epoch: &mut u64, out: &mut Vec<f32>, max_samples: usize) -> PopResult {
        let mut inner = self.lock();
        if inner.epoch != *epoch {
            *epoch = inner.epoch;
            return PopResult::Stale;
        }
        if inner.samples.is_empty() {
            return if inner.finished { PopResult::Drained } else { PopResult::Starved };
        }
        let channels = inner.spec.map_or(1, |s| s.channels.max(1) as usize);
        let wanted = inner.samples.len().min(max_samples);
        let take = wanted - wanted % channels;
        if take == 0 {
            return PopResult::Starved;
        }
        out.extend(inner.samples.drain(..take));
        self.frames_played.fetch_add((take / channels) as u64, Ordering::Relaxed);
        self.space.notify_all();
        PopResult::Data
    }

    pub fn buffered_ms(&self) -> u64 {
        let inner = self.lock();
        match inner.spec {
            Some(spec) if spec.sample_rate > 0 => inner.samples.len() as u64 * 1000 / (spec.sample_rate as u64 * spec.channels.max(1) as u64),
            _ => 0,
        }
    }

    pub fn position_ms(&self) -> u64 {
        let inner = self.lock();
        let frames = self.frames_played.load(Ordering::Relaxed);
        match inner.spec {
            Some(spec) if spec.sample_rate > 0 => inner.seek_base_ms + frames * 1000 / spec.sample_rate as u64,
            _ => inner.seek_base_ms,
        }
    }

    pub fn spec(&self) -> Option<AudioSpec> {
        self.lock().spec
    }

    pub fn is_finished(&self) -> bool {
        self.lock().finished
    }

    #[cfg(test)]
    pub fn frames_played(&self) -> u64 {
        self.frames_played.load(Ordering::Relaxed)
    }

    pub fn set_starved(&self, value: bool) {
        self.starved.store(value, Ordering::Relaxed);
    }

    pub fn is_starved(&self) -> bool {
        self.starved.load(Ordering::Relaxed)
    }

    pub fn set_drained(&self, value: bool) {
        self.drained.store(value, Ordering::Relaxed);
    }

    pub fn is_drained(&self) -> bool {
        self.drained.load(Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    const SPEC: AudioSpec = AudioSpec { sample_rate: 1000, channels: 2 };

    fn feed_with_spec(base: u64) -> Arc<Feed> {
        let feed = Feed::new(base);
        assert!(feed.set_spec(feed.epoch(), SPEC));
        feed
    }

    #[test]
    fn empty_feed_is_starved_until_finished() {
        let feed = feed_with_spec(0);
        let mut epoch = feed.epoch();
        let mut out = Vec::new();
        assert_eq!(feed.pop_into(&mut epoch, &mut out, 64), PopResult::Starved);
        feed.finish(epoch);
        assert_eq!(feed.pop_into(&mut epoch, &mut out, 64), PopResult::Drained);
    }

    #[test]
    fn pop_returns_whole_frames_and_advances_position() {
        let feed = feed_with_spec(500);
        let epoch = feed.epoch();
        assert!(feed.push(epoch, &[0.1; 10]));
        let mut seen = epoch;
        let mut out = Vec::new();
        assert_eq!(feed.pop_into(&mut seen, &mut out, 7), PopResult::Data);
        assert_eq!(out.len(), 6);
        assert_eq!(feed.frames_played(), 3);
        assert_eq!(feed.position_ms(), 503);
        assert_eq!(feed.buffered_ms(), 2);
    }

    #[test]
    fn reset_makes_consumers_and_producers_stale() {
        let feed = feed_with_spec(0);
        let old = feed.epoch();
        assert!(feed.push(old, &[0.0; 4]));
        let new = feed.reset(2000);
        assert_ne!(old, new);
        assert!(!feed.push(old, &[0.0; 2]));
        let mut seen = old;
        let mut out = Vec::new();
        assert_eq!(feed.pop_into(&mut seen, &mut out, 8), PopResult::Stale);
        assert_eq!(seen, new);
        assert_eq!(feed.pop_into(&mut seen, &mut out, 8), PopResult::Starved);
        assert_eq!(feed.position_ms(), 2000);
    }

    #[test]
    fn push_blocks_when_full_and_close_unblocks() {
        let feed = feed_with_spec(0);
        let epoch = feed.epoch();
        let full = vec![0.0; SPEC.samples_for_ms(MAX_BUFFER_MS)];
        assert!(feed.push(epoch, &full));
        let producer = {
            let feed = feed.clone();
            thread::spawn(move || feed.push(epoch, &[0.0; 2]))
        };
        thread::sleep(Duration::from_millis(100));
        assert!(!producer.is_finished());
        feed.close();
        assert!(!producer.join().unwrap());
    }

    #[test]
    fn flags_round_trip() {
        let feed = feed_with_spec(0);
        feed.set_starved(true);
        feed.set_drained(true);
        assert!(feed.is_starved());
        assert!(feed.is_drained());
        feed.reset(0);
        assert!(!feed.is_starved());
        assert!(!feed.is_drained());
    }
}
