use std::sync::Arc;
use std::time::Duration;

use rodio::cpal::traits::{DeviceTrait, HostTrait};
use rodio::{OutputStream, OutputStreamHandle, Sink, Source};

use super::feed::{AudioSpec, Feed, PopResult};
use super::ports::{AudioOutput, SlotSink};
use crate::models::error::PlayerError;

const CHUNK_SAMPLES: usize = 2048;
const SILENCE_FRAMES: usize = 256;

pub struct TrackSource {
    feed: Arc<Feed>,
    epoch: u64,
    spec: AudioSpec,
    local: Vec<f32>,
    pos: usize,
}

impl TrackSource {
    pub fn new(feed: Arc<Feed>, spec: AudioSpec) -> Self {
        let epoch = feed.epoch();
        Self { feed, epoch, spec, local: Vec::with_capacity(CHUNK_SAMPLES), pos: 0 }
    }

    fn refill(&mut self) -> bool {
        self.local.clear();
        self.pos = 0;
        match self.feed.pop_into(&mut self.epoch, &mut self.local, CHUNK_SAMPLES) {
            PopResult::Data => {
                self.feed.set_starved(false);
                true
            }
            PopResult::Drained => {
                self.feed.set_drained(true);
                false
            }
            PopResult::Starved | PopResult::Stale => {
                self.feed.set_starved(true);
                self.local.resize(SILENCE_FRAMES * self.spec.channels.max(1) as usize, 0.0);
                true
            }
        }
    }
}

impl Iterator for TrackSource {
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        if self.pos >= self.local.len() && !self.refill() {
            return None;
        }
        let sample = self.local.get(self.pos).copied().unwrap_or(0.0);
        self.pos += 1;
        Some(sample)
    }
}

impl Source for TrackSource {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }

    fn channels(&self) -> u16 {
        self.spec.channels
    }

    fn sample_rate(&self) -> u32 {
        self.spec.sample_rate
    }

    fn total_duration(&self) -> Option<Duration> {
        None
    }
}

struct RodioSlotSink(Sink);

impl SlotSink for RodioSlotSink {
    fn play(&self) {
        self.0.play();
    }

    fn pause(&self) {
        self.0.pause();
    }

    fn set_volume(&self, volume: f32) {
        self.0.set_volume(volume);
    }
}

#[derive(Default)]
pub struct RodioOutput {
    stream: Option<(OutputStream, OutputStreamHandle)>,
    device_name: Option<String>,
}

fn default_device_name() -> Option<String> {
    rodio::cpal::default_host().default_output_device().and_then(|device| device.name().ok())
}

impl RodioOutput {
    fn build_sink(&self, feed: Arc<Feed>) -> Result<Sink, PlayerError> {
        let spec = feed.spec().ok_or_else(|| PlayerError::Output("stream format unknown".into()))?;
        let Some((_, handle)) = self.stream.as_ref() else {
            return Err(PlayerError::Output("output stream not open".into()));
        };
        let sink = Sink::try_new(handle).map_err(|e| {
            log::error!("[player::output] Failed to create sink: {} ({:?})", e, e);
            PlayerError::Output(e.to_string())
        })?;
        sink.pause();
        sink.append(TrackSource::new(feed, spec));
        Ok(sink)
    }
}

impl AudioOutput for RodioOutput {
    fn ensure_open(&mut self) -> Result<(), PlayerError> {
        if self.stream.is_some() {
            return Ok(());
        }
        let opened = OutputStream::try_default().map_err(|e| {
            log::error!("[player::output] Failed to open default output stream: {} ({:?})", e, e);
            PlayerError::Output(e.to_string())
        })?;
        self.device_name = default_device_name();
        log::info!("[player::output] Opened output stream on device {:?}", self.device_name);
        self.stream = Some(opened);
        Ok(())
    }

    fn is_open(&self) -> bool {
        self.stream.is_some()
    }

    fn release(&mut self) {
        if self.stream.take().is_some() {
            log::info!("[player::output] Released output stream (device {:?})", self.device_name);
        }
    }

    fn create_sink(&mut self, feed: Arc<Feed>) -> Result<Box<dyn SlotSink>, PlayerError> {
        self.ensure_open()?;
        let sink = self.build_sink(feed)?;
        Ok(Box::new(RodioSlotSink(sink)))
    }

    fn default_device_changed(&mut self) -> bool {
        if self.stream.is_none() {
            return false;
        }
        let current = default_device_name();
        if current.is_none() || current == self.device_name {
            return false;
        }
        log::info!("[player::output] Default output device changed: {:?} -> {:?}", self.device_name, current);
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SPEC: AudioSpec = AudioSpec { sample_rate: 1000, channels: 2 };

    fn feed() -> Arc<Feed> {
        let feed = Feed::new(0);
        feed.set_spec(feed.epoch(), SPEC);
        feed
    }

    #[test]
    fn passes_samples_through() {
        let feed = feed();
        feed.push(feed.epoch(), &[0.25, -0.25]);
        let mut source = TrackSource::new(feed.clone(), SPEC);
        assert_eq!(source.next(), Some(0.25));
        assert_eq!(source.next(), Some(-0.25));
        assert!(!feed.is_starved());
        assert_eq!(source.channels(), 2);
        assert_eq!(source.sample_rate(), 1000);
    }

    #[test]
    fn outputs_frame_aligned_silence_when_starved() {
        let feed = feed();
        let mut source = TrackSource::new(feed.clone(), SPEC);
        let silence: Vec<f32> = (0..SILENCE_FRAMES * 2).map(|_| source.next().unwrap()).collect();
        assert!(silence.iter().all(|s| *s == 0.0));
        assert!(feed.is_starved());
        assert_eq!(feed.frames_played(), 0);
    }

    #[test]
    fn ends_when_drained() {
        let feed = feed();
        feed.finish(feed.epoch());
        let mut source = TrackSource::new(feed.clone(), SPEC);
        assert_eq!(source.next(), None);
        assert!(feed.is_drained());
    }

    #[test]
    fn follows_epoch_after_reset() {
        let feed = feed();
        let mut source = TrackSource::new(feed.clone(), SPEC);
        let epoch = feed.reset(500);
        feed.push(epoch, &[0.5, 0.5]);
        assert_eq!(source.next(), Some(0.0));
        for _ in 1..SILENCE_FRAMES * 2 {
            source.next();
        }
        assert_eq!(source.next(), Some(0.5));
    }
}
