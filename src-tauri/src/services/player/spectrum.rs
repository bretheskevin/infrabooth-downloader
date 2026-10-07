use std::f32::consts::PI;
use std::sync::atomic::{AtomicU16, AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use rustfft::num_complex::Complex32;
use rustfft::{Fft, FftPlanner};

use ringbuf::traits::{Consumer, Observer, Producer, Split};
use ringbuf::{HeapCons, HeapProd, HeapRb};

use super::feed::AudioSpec;

pub const RING_CAPACITY: usize = 16 * 1024;
const SPECTRUM_BAND_COUNT: usize = 24;
const FFT_SIZE: usize = 2048;
const MIN_HZ: f32 = 30.0;
const MAX_HZ: f32 = 16_000.0;
const ATTACK: f32 = 0.7;
const DECAY: f32 = 0.3;
const PAUSE_DECAY: f32 = 0.08;
const SILENCE_EPSILON: f32 = 0.01;
const FRAME_INTERVAL: Duration = Duration::from_millis(33);
const NO_OWNER: u64 = 0;

pub struct SharedSpectrum {
    producer: Mutex<HeapProd<f32>>,
    sample_rate: AtomicU32,
    channels: AtomicU16,
    generation: AtomicU32,
    owner: AtomicU64,
    next_tap_id: AtomicU64,
}

/// One per `TrackSource`. Only the tap that claimed the ring feeds it, until it is dropped, so a
/// crossfade shows the outgoing track instead of splicing both tracks' chunks into one FFT window.
pub struct SpectrumTap {
    shared: Arc<SharedSpectrum>,
    id: u64,
}

/// Log-spaced FFT bin ranges for the display bands, recomputed per sample rate.
#[derive(Debug, Clone)]
struct BandLayout {
    ranges: [(usize, usize); SPECTRUM_BAND_COUNT],
}

impl BandLayout {
    fn new(sample_rate: u32) -> Self {
        let max_hz = MAX_HZ.min(sample_rate as f32 / 2.0);
        let mut ranges = [(0usize, 0usize); SPECTRUM_BAND_COUNT];
        for (band, range) in ranges.iter_mut().enumerate() {
            let low = MIN_HZ * (max_hz / MIN_HZ).powf(band as f32 / SPECTRUM_BAND_COUNT as f32);
            let high = MIN_HZ * (max_hz / MIN_HZ).powf((band + 1) as f32 / SPECTRUM_BAND_COUNT as f32);
            let start = ((low * FFT_SIZE as f32 / sample_rate as f32) as usize).clamp(1, FFT_SIZE / 2 - 1);
            let end = ((high * FFT_SIZE as f32 / sample_rate as f32).ceil() as usize).clamp(start + 1, FFT_SIZE / 2);
            *range = (start, end);
        }
        Self { ranges }
    }
}

struct FftState {
    fft: Arc<dyn Fft<f32>>,
    buffer: Vec<Complex32>,
    hann: Vec<f32>,
}

impl FftState {
    fn new() -> Self {
        let fft = FftPlanner::new().plan_fft_forward(FFT_SIZE);
        let hann = (0..FFT_SIZE).map(|i| 0.5 * (1.0 - (2.0 * PI * i as f32 / (FFT_SIZE - 1) as f32).cos())).collect();
        Self { fft, buffer: vec![Complex32::ZERO; FFT_SIZE], hann }
    }
}

/// Pure analysis: mono window -> 24 dB-normalized band values in `0.0..=1.0`.
/// A full-scale sine yields ~1.0 in its band; the dB floor is -60 dB.
fn analyze(frames: &[f32], layout: &BandLayout, state: &mut FftState) -> [f32; SPECTRUM_BAND_COUNT] {
    debug_assert_eq!(frames.len(), FFT_SIZE);
    for ((slot, &frame), &window) in state.buffer.iter_mut().zip(frames).zip(&state.hann) {
        *slot = Complex32::new(frame * window, 0.0);
    }
    state.fft.process(&mut state.buffer);
    let norm = FFT_SIZE as f32 / 4.0; // Hann coherent gain 0.5 -> full-scale sine peaks at N/4
    let mut bands = [0.0f32; SPECTRUM_BAND_COUNT];
    for (band, &(start, end)) in layout.ranges.iter().enumerate() {
        let peak: f32 = state.buffer[start..end].iter().map(|c| c.norm()).fold(0.0, f32::max);
        let magnitude = peak / norm;
        let db = 20.0 * magnitude.max(1e-6).log10();
        bands[band] = ((db + 60.0) / 60.0).clamp(0.0, 1.0);
    }
    bands
}

/// Per-frame smoothing: fast attack, slow decay.
fn smooth_into(current: &mut [f32; SPECTRUM_BAND_COUNT], new: &[f32; SPECTRUM_BAND_COUNT]) {
    for (c, n) in current.iter_mut().zip(new.iter()) {
        let blend = if *n > *c { ATTACK } else { DECAY };
        *c += (*n - *c) * blend;
    }
}

/// Gentle per-frame fade used when no samples flow (pause/starvation), so the
/// visualizer eases out over ~2 s instead of snapping off.
fn decay_on_silence(bands: &mut [f32; SPECTRUM_BAND_COUNT]) {
    for band in bands.iter_mut() {
        *band *= 1.0 - PAUSE_DECAY;
    }
}

impl SharedSpectrum {
    pub fn new(capacity: usize) -> (Self, HeapCons<f32>) {
        let (producer, consumer) = HeapRb::new(capacity).split();
        let shared = Self {
            producer: Mutex::new(producer),
            sample_rate: AtomicU32::new(48_000),
            channels: AtomicU16::new(2),
            generation: AtomicU32::new(0),
            owner: AtomicU64::new(NO_OWNER),
            next_tap_id: AtomicU64::new(NO_OWNER + 1),
        };
        (shared, consumer)
    }

    fn set_format(&self, sample_rate: u32, channels: u16) {
        self.sample_rate.store(sample_rate, Ordering::Relaxed);
        self.channels.store(channels, Ordering::Relaxed);
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate.load(Ordering::Relaxed)
    }

    pub fn channels(&self) -> u16 {
        self.channels.load(Ordering::Relaxed)
    }

    pub fn set_generation(&self, generation: u32) {
        self.generation.store(generation, Ordering::Relaxed);
    }

    pub fn generation(&self) -> u32 {
        self.generation.load(Ordering::Relaxed)
    }

    fn try_claim(&self, tap_id: u64) -> bool {
        match self.owner.compare_exchange(NO_OWNER, tap_id, Ordering::AcqRel, Ordering::Acquire) {
            Ok(_) => true,
            Err(owner) => owner == tap_id,
        }
    }

    /// Never blocks: drops the chunk on lock contention; when the ring is nearly full only the
    /// chunk's tail fits, and when it is full the whole chunk is dropped.
    fn try_push(&self, samples: &[f32]) {
        let Ok(mut producer) = self.producer.try_lock() else { return };
        let vacant = producer.vacant_len();
        let keep = &samples[samples.len().saturating_sub(vacant)..];
        let _ = producer.push_slice(keep);
    }
}

impl SpectrumTap {
    pub fn new(shared: Arc<SharedSpectrum>) -> Self {
        let id = shared.next_tap_id.fetch_add(1, Ordering::Relaxed);
        Self { shared, id }
    }

    /// Called from the real-time audio thread: atomics and a `try_lock` only.
    pub fn push(&self, spec: AudioSpec, samples: &[f32]) {
        if !self.shared.try_claim(self.id) {
            return;
        }
        self.shared.set_format(spec.sample_rate, spec.channels);
        self.shared.try_push(samples);
    }
}

impl Drop for SpectrumTap {
    fn drop(&mut self) {
        let _ = self.shared.owner.compare_exchange(self.id, NO_OWNER, Ordering::AcqRel, Ordering::Relaxed);
    }
}

/// Spawns the `spectrum-worker` thread: drains the ring at ~30 Hz, runs FFT +
/// band reduction + smoothing, and emits `player-spectrum` events. Purely
/// cosmetic — if the thread dies, playback is unaffected.
pub fn start_worker(app: tauri::AppHandle, spectrum: Arc<SharedSpectrum>, consumer: HeapCons<f32>) {
    let spawned = std::thread::Builder::new().name("spectrum-worker".into()).spawn(move || run_worker(app, spectrum, consumer));
    match spawned {
        Ok(_) => log::info!("[player::spectrum] Worker thread started"),
        Err(e) => log::error!("[player::spectrum] Failed to spawn worker thread: {} (kind={:?})", e, e.kind()),
    }
}

fn run_worker(app: tauri::AppHandle, spectrum: Arc<SharedSpectrum>, mut consumer: HeapCons<f32>) {
    let mut format = (0u32, 0u16);
    let mut layout = BandLayout::new(spectrum.sample_rate());
    let mut state = FftState::new();
    let mut bands = [0.0f32; SPECTRUM_BAND_COUNT];
    let mut mono: Vec<f32> = Vec::with_capacity(2 * FFT_SIZE);
    let mut scratch: Vec<f32> = Vec::with_capacity(RING_CAPACITY);
    let mut emitting = false;
    loop {
        let frame_start = Instant::now();
        let available = consumer.occupied_len();
        if available > 0 {
            let current = (spectrum.sample_rate(), spectrum.channels().max(1));
            if current != format {
                log::info!("[player::spectrum] Format {} Hz / {} ch; rebuilding band layout", current.0, current.1);
                layout = BandLayout::new(current.0);
                format = current;
            }
            scratch.clear();
            scratch.resize(available.min(RING_CAPACITY), 0.0);
            let popped = consumer.pop_slice(&mut scratch);
            let channels = format.1 as usize;
            mono.extend(scratch[..popped].chunks_exact(channels).map(|chunk| chunk.iter().sum::<f32>() / channels as f32));
            if mono.len() > FFT_SIZE {
                mono.drain(..mono.len() - FFT_SIZE);
            }
            if mono.len() == FFT_SIZE {
                smooth_into(&mut bands, &analyze(&mono, &layout, &mut state));
            }
        } else {
            decay_on_silence(&mut bands);
        }
        let silent = bands.iter().all(|b| *b < SILENCE_EPSILON);
        if silent == emitting {
            log::info!("[player::spectrum] {} emitting (gen={})", if silent { "Stopped" } else { "Started" }, spectrum.generation());
        }
        if !silent || emitting {
            crate::services::events::emit_player_spectrum(&app, spectrum.generation(), &bands);
            emitting = !silent;
        }
        std::thread::sleep(FRAME_INTERVAL.saturating_sub(frame_start.elapsed()));
    }
}

#[cfg(test)]
mod ring_tests {
    use super::*;

    #[test]
    fn try_push_delivers_samples_to_the_consumer() {
        let (shared, mut consumer) = SharedSpectrum::new(8);
        shared.try_push(&[0.1, 0.2, 0.3]);
        let mut out = [0.0f32; 3];
        assert_eq!(consumer.pop_slice(&mut out), 3);
        assert_eq!(out, [0.1, 0.2, 0.3]);
    }

    #[test]
    fn try_push_keeps_newest_samples_when_full() {
        let (shared, mut consumer) = SharedSpectrum::new(4);
        shared.try_push(&[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
        let mut out = [0.0f32; 4];
        assert_eq!(consumer.pop_slice(&mut out), 4);
        assert_eq!(out, [3.0, 4.0, 5.0, 6.0]);
    }

    #[test]
    fn try_push_skips_when_the_ring_is_locked() {
        let (shared, consumer) = SharedSpectrum::new(8);
        let guard = shared.producer.lock();
        assert!(guard.is_ok());
        shared.try_push(&[1.0, 2.0]);
        drop(guard);
        assert_eq!(consumer.occupied_len(), 0);
    }

    #[test]
    fn format_and_generation_round_trip() {
        let (shared, _consumer) = SharedSpectrum::new(8);
        shared.set_format(44_100, 1);
        shared.set_generation(42);
        assert_eq!(shared.sample_rate(), 44_100);
        assert_eq!(shared.channels(), 1);
        assert_eq!(shared.generation(), 42);
    }

    const OUTGOING: AudioSpec = AudioSpec { sample_rate: 44_100, channels: 2 };
    const INCOMING: AudioSpec = AudioSpec { sample_rate: 48_000, channels: 1 };

    #[test]
    fn only_the_claiming_tap_feeds_the_ring_until_it_is_dropped() {
        let (shared, mut consumer) = SharedSpectrum::new(8);
        let shared = Arc::new(shared);
        let outgoing = SpectrumTap::new(shared.clone());
        let incoming = SpectrumTap::new(shared.clone());
        let mut out = [0.0f32; 8];

        outgoing.push(OUTGOING, &[1.0, 1.0]);
        incoming.push(INCOMING, &[2.0, 2.0]);
        assert_eq!(consumer.pop_slice(&mut out), 2);
        assert_eq!(&out[..2], &[1.0, 1.0]);
        assert_eq!((shared.sample_rate(), shared.channels()), (OUTGOING.sample_rate, OUTGOING.channels));

        drop(outgoing);
        incoming.push(INCOMING, &[2.0, 2.0]);
        assert_eq!(consumer.pop_slice(&mut out), 2);
        assert_eq!(&out[..2], &[2.0, 2.0]);
        assert_eq!((shared.sample_rate(), shared.channels()), (INCOMING.sample_rate, INCOMING.channels));
    }

    fn sine(freq: f32, sample_rate: u32) -> Vec<f32> {
        (0..FFT_SIZE).map(|i| (2.0 * std::f32::consts::PI * freq * i as f32 / sample_rate as f32).sin()).collect()
    }

    #[test]
    fn band_layout_stays_within_valid_bins() {
        for sample_rate in [44_100, 48_000] {
            let layout = BandLayout::new(sample_rate);
            for &(start, end) in &layout.ranges {
                assert!(start >= 1 && start < end && end <= FFT_SIZE / 2, "bad range ({start}, {end}) at {sample_rate} Hz");
            }
        }
    }

    #[test]
    fn band_layout_covers_the_full_frequency_range() {
        let layout = BandLayout::new(48_000);
        let first_hz = layout.ranges[0].0 as f32 * 48_000.0 / FFT_SIZE as f32;
        let last_hz = layout.ranges[SPECTRUM_BAND_COUNT - 1].1 as f32 * 48_000.0 / FFT_SIZE as f32;
        assert!(first_hz <= 2.0 * MIN_HZ, "first band starts at {first_hz} Hz");
        assert!(last_hz >= MAX_HZ * 0.9, "last band ends at {last_hz} Hz");
    }

    #[test]
    fn silence_yields_silent_bands() {
        let layout = BandLayout::new(48_000);
        let mut state = FftState::new();
        let bands = analyze(&[0.0; FFT_SIZE], &layout, &mut state);
        assert!(bands.iter().all(|b| *b == 0.0));
    }

    #[test]
    fn a_sine_peaks_near_its_own_band() {
        let sample_rate = 48_000;
        for freq in [250.0, 2_000.0, 8_000.0] {
            let layout = BandLayout::new(sample_rate);
            let mut state = FftState::new();
            let bands = analyze(&sine(freq, sample_rate), &layout, &mut state);
            let peak = (0..SPECTRUM_BAND_COUNT).max_by(|&a, &b| bands[a].total_cmp(&bands[b])).unwrap_or_default();
            let bin = (freq * FFT_SIZE as f32 / sample_rate as f32) as usize;
            let Some(expected) = layout.ranges.iter().position(|&(s, e)| bin >= s && bin < e) else {
                panic!("{freq} Hz (bin {bin}) falls outside every band");
            };
            assert!((peak as i32 - expected as i32).abs() <= 1, "{freq} Hz peaked in band {peak}, expected near band {expected}");
            assert!(bands[peak] > 0.7, "peak band too quiet for {freq} Hz: {}", bands[peak]);
        }
    }

    #[test]
    fn smoothing_attacks_fast_and_decays_slow() {
        let mut current = [0.0f32; SPECTRUM_BAND_COUNT];
        smooth_into(&mut current, &[1.0; SPECTRUM_BAND_COUNT]);
        assert!((current[0] - ATTACK).abs() < 1e-6);
        let after_attack = current[0];
        smooth_into(&mut current, &[0.0; SPECTRUM_BAND_COUNT]);
        assert!((current[0] - after_attack * (1.0 - DECAY)).abs() < 1e-6);
    }

    #[test]
    fn silence_decay_fades_gently_over_about_two_seconds() {
        let mut bands = [1.0f32; SPECTRUM_BAND_COUNT];
        decay_on_silence(&mut bands);
        assert!((bands[0] - (1.0 - PAUSE_DECAY)).abs() < 1e-6);
        let mut frames = 0;
        while bands[0] >= SILENCE_EPSILON && frames < 300 {
            decay_on_silence(&mut bands);
            frames += 1;
        }
        // ~30 fps worker: the fade should take roughly 1–3 seconds
        assert!(frames > 30, "fade too fast: {frames} frames");
        assert!(frames < 90, "fade too slow: {frames} frames");
    }
}
