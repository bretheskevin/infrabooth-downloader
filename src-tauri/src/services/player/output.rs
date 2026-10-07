use std::sync::Arc;
use std::time::Duration;

use rodio::cpal::traits::{DeviceTrait, HostTrait};
use rodio::{OutputStream, OutputStreamHandle, Sink, Source};

use super::equalizer::{Equalizer, EqualizerSettings, SharedEqualizer, BAND_COUNT};
use super::feed::{AudioSpec, Feed, PopResult};
use super::ports::{AudioOutput, SlotSink};
use super::spectrum::{SharedSpectrum, SpectrumTap};
use crate::models::error::PlayerError;

const CHUNK_SAMPLES: usize = 2048;
const SILENCE_FRAMES: usize = 256;

pub struct TrackSource {
    feed: Arc<Feed>,
    epoch: u64,
    spec: AudioSpec,
    local: Vec<f32>,
    pos: usize,
    equalizer: Equalizer,
    spectrum: SpectrumTap,
}

impl TrackSource {
    pub fn new(feed: Arc<Feed>, spec: AudioSpec, equalizer: Arc<SharedEqualizer>, spectrum: Arc<SharedSpectrum>) -> Self {
        let epoch = feed.epoch();
        let equalizer = Equalizer::new(equalizer, spec.sample_rate, spec.channels);
        let spectrum = SpectrumTap::new(spectrum);
        Self { feed, epoch, spec, local: Vec::with_capacity(CHUNK_SAMPLES), pos: 0, equalizer, spectrum }
    }

    fn refill(&mut self) -> bool {
        self.local.clear();
        self.pos = 0;
        match self.feed.pop_into(&mut self.epoch, &mut self.local, CHUNK_SAMPLES) {
            PopResult::Data => {
                self.feed.set_starved(false);
                self.equalizer.process(&mut self.local);
                self.spectrum.push(self.spec, &self.local);
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

pub struct RodioOutput {
    stream: Option<(OutputStream, OutputStreamHandle)>,
    device_name: Option<String>,
    equalizer: Arc<SharedEqualizer>,
    spectrum: Arc<SharedSpectrum>,
}

impl RodioOutput {
    pub fn new(spectrum: Arc<SharedSpectrum>) -> Self {
        Self { stream: None, device_name: None, equalizer: Arc::default(), spectrum }
    }
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
        sink.append(TrackSource::new(feed, spec, self.equalizer.clone(), self.spectrum.clone()));
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

    fn set_equalizer(&mut self, settings: EqualizerSettings) {
        if settings.gains_db.len() != BAND_COUNT {
            log::warn!("[player::equalizer] Expected {} gains, received {}: {:?}", BAND_COUNT, settings.gains_db.len(), settings.gains_db);
        }
        let params = settings.normalized();
        log::info!("[player::equalizer] Applying settings: enabled={} bypassed={} gains_db={:?}", params.enabled, params.is_bypassed(), params.gains_db);
        self.equalizer.set(params);
    }

    fn set_spectrum_generation(&mut self, generation: u32) {
        self.spectrum.set_generation(generation);
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
    use crate::services::player::equalizer::EqualizerParams;
    use ringbuf::traits::Observer;
    use ringbuf::HeapCons;

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
        let mut source = TrackSource::new(feed.clone(), SPEC, Arc::default(), spectrum().0);
        assert_eq!(source.next(), Some(0.25));
        assert_eq!(source.next(), Some(-0.25));
        assert!(!feed.is_starved());
        assert_eq!(source.channels(), 2);
        assert_eq!(source.sample_rate(), 1000);
    }

    #[test]
    fn outputs_frame_aligned_silence_when_starved() {
        let feed = feed();
        let mut source = TrackSource::new(feed.clone(), SPEC, Arc::default(), spectrum().0);
        let silence: Vec<f32> = (0..SILENCE_FRAMES * 2).map(|_| source.next().unwrap()).collect();
        assert!(silence.iter().all(|s| *s == 0.0));
        assert!(feed.is_starved());
        assert_eq!(feed.frames_played(), 0);
    }

    #[test]
    fn ends_when_drained() {
        let feed = feed();
        feed.finish(feed.epoch());
        let mut source = TrackSource::new(feed.clone(), SPEC, Arc::default(), spectrum().0);
        assert_eq!(source.next(), None);
        assert!(feed.is_drained());
    }

    #[test]
    fn follows_epoch_after_reset() {
        let feed = feed();
        let mut source = TrackSource::new(feed.clone(), SPEC, Arc::default(), spectrum().0);
        let epoch = feed.reset(500);
        feed.push(epoch, &[0.5, 0.5]);
        assert_eq!(source.next(), Some(0.0));
        for _ in 1..SILENCE_FRAMES * 2 {
            source.next();
        }
        assert_eq!(source.next(), Some(0.5));
    }

    #[test]
    fn flat_enabled_equalizer_keeps_samples_unchanged() {
        let feed = feed();
        feed.push(feed.epoch(), &[0.25, -0.25]);
        let equalizer = Arc::new(SharedEqualizer::default());
        equalizer.set(EqualizerParams { enabled: true, gains_db: [0.0; BAND_COUNT] });
        let mut source = TrackSource::new(feed.clone(), SPEC, equalizer, spectrum().0);
        assert_eq!(source.next(), Some(0.25));
        assert_eq!(source.next(), Some(-0.25));
    }

    #[test]
    fn applies_the_shared_equalizer_to_popped_samples() {
        let feed = feed();
        let mut impulse = vec![0.0; 64];
        impulse[0] = 1.0;
        feed.push(feed.epoch(), &impulse);
        let equalizer = Arc::new(SharedEqualizer::default());
        let mut gains_db = [0.0; BAND_COUNT];
        gains_db[0] = -6.0;
        equalizer.set(EqualizerParams { enabled: true, gains_db });
        let mut source = TrackSource::new(feed.clone(), SPEC, equalizer, spectrum().0);
        let left = source.next().unwrap();
        let right = source.next().unwrap();
        assert!(left.is_finite() && (left - 1.0).abs() > 1e-3, "left impulse should be filtered, got {left}");
        assert_eq!(right, 0.0);
    }

    fn spectrum() -> (Arc<SharedSpectrum>, HeapCons<f32>) {
        let (shared, consumer) = SharedSpectrum::new(64);
        (Arc::new(shared), consumer)
    }

    #[test]
    fn pushes_played_samples_into_the_spectrum_ring() {
        let feed = feed();
        feed.push(feed.epoch(), &[0.25, -0.25]);
        let (shared, consumer) = spectrum();
        let mut source = TrackSource::new(feed.clone(), SPEC, Arc::default(), shared);
        assert_eq!(source.next(), Some(0.25));
        assert_eq!(consumer.occupied_len(), 2);
    }

    #[test]
    fn a_preloaded_source_does_not_override_the_spectrum_format_until_it_plays() {
        let feed = feed();
        feed.push(feed.epoch(), &[0.25, -0.25]);
        let (shared, _consumer) = spectrum();
        let mut source = TrackSource::new(feed.clone(), SPEC, Arc::default(), shared.clone());
        assert_ne!(shared.sample_rate(), SPEC.sample_rate);
        source.next();
        assert_eq!(shared.sample_rate(), SPEC.sample_rate);
    }

    #[test]
    fn forwards_the_generation_to_the_shared_spectrum() {
        let (shared, _consumer) = spectrum();
        let mut output = RodioOutput::new(shared.clone());
        AudioOutput::set_spectrum_generation(&mut output, 42);
        assert_eq!(shared.generation(), 42);
    }
}
