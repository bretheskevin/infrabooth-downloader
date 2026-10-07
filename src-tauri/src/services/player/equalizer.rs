use std::f64::consts::PI;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, TryLockError};

use serde::{Deserialize, Serialize};
use specta::Type;

pub const BAND_COUNT: usize = 5;
pub const BAND_FREQUENCIES_HZ: [f32; BAND_COUNT] = [60.0, 230.0, 910.0, 3600.0, 14000.0];
pub const MAX_GAIN_DB: f32 = 6.0;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum EqualizerPreset {
    #[default]
    Flat,
    BassBoost,
    TrebleBoost,
    Vocal,
    Electronic,
    Rock,
    Acoustic,
    Custom,
}

impl EqualizerPreset {
    pub const BUILT_IN: [EqualizerPreset; 7] = [Self::Flat, Self::BassBoost, Self::TrebleBoost, Self::Vocal, Self::Electronic, Self::Rock, Self::Acoustic];

    pub fn id(self) -> &'static str {
        match self {
            Self::Flat => "flat",
            Self::BassBoost => "bassBoost",
            Self::TrebleBoost => "trebleBoost",
            Self::Vocal => "vocal",
            Self::Electronic => "electronic",
            Self::Rock => "rock",
            Self::Acoustic => "acoustic",
            Self::Custom => "custom",
        }
    }

    pub fn from_built_in_id(id: &str) -> Option<Self> {
        Self::BUILT_IN.into_iter().find(|preset| preset.id() == id)
    }

    pub fn default_label(self) -> &'static str {
        match self {
            Self::Flat => "Flat",
            Self::BassBoost => "Bass +",
            Self::TrebleBoost => "Treble +",
            Self::Vocal => "Vocal",
            Self::Electronic => "Electronic",
            Self::Rock => "Rock",
            Self::Acoustic => "Acoustic",
            Self::Custom => "Custom",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EqualizerSettings {
    pub enabled: bool,
    pub gains_db: Vec<f32>,
}

impl EqualizerSettings {
    pub fn normalized(&self) -> EqualizerParams {
        let mut gains_db = [0.0; BAND_COUNT];
        for (slot, gain) in gains_db.iter_mut().zip(&self.gains_db) {
            *slot = if gain.is_finite() { gain.clamp(-MAX_GAIN_DB, MAX_GAIN_DB) } else { 0.0 };
        }
        EqualizerParams { enabled: self.enabled, gains_db }
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct EqualizerParams {
    pub enabled: bool,
    pub gains_db: [f32; BAND_COUNT],
}

impl EqualizerParams {
    pub fn is_bypassed(&self) -> bool {
        !self.enabled || self.gains_db.iter().all(|gain| *gain == 0.0)
    }
}

#[derive(Default)]
pub struct SharedEqualizer {
    params: Mutex<EqualizerParams>,
    version: AtomicU64,
}

impl SharedEqualizer {
    pub fn set(&self, params: EqualizerParams) {
        *self.params.lock().unwrap_or_else(|p| p.into_inner()) = params;
        self.version.fetch_add(1, Ordering::Release);
    }

    pub fn snapshot(&self) -> (u64, EqualizerParams) {
        let version = self.version.load(Ordering::Acquire);
        (version, *self.params.lock().unwrap_or_else(|p| p.into_inner()))
    }

    pub fn try_snapshot_since(&self, seen: u64) -> Option<(u64, EqualizerParams)> {
        let version = self.version.load(Ordering::Acquire);
        if version == seen {
            return None;
        }
        let params = match self.params.try_lock() {
            Ok(guard) => *guard,
            Err(TryLockError::Poisoned(poisoned)) => *poisoned.into_inner(),
            Err(TryLockError::WouldBlock) => return None,
        };
        Some((version, params))
    }
}

const NYQUIST_GUARD: f64 = 0.9;
const TWO_OCTAVE_BANDWIDTH_Q: f64 = 2.0 / 3.0;
const STATE_FLOOR: f64 = 1e-12;

#[derive(Debug, Clone, Copy, PartialEq)]
struct Coefficients {
    b0: f64,
    b1: f64,
    b2: f64,
    a1: f64,
    a2: f64,
}

impl Coefficients {
    const IDENTITY: Self = Self { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 };

    fn peaking(sample_rate: f64, center_hz: f64, gain_db: f64) -> Self {
        let amplitude = 10f64.powf(gain_db / 40.0);
        let (sin_w0, cos_w0) = (2.0 * PI * center_hz / sample_rate).sin_cos();
        let alpha = sin_w0 / (2.0 * TWO_OCTAVE_BANDWIDTH_Q);
        let a0 = 1.0 + alpha / amplitude;
        Self {
            b0: (1.0 + alpha * amplitude) / a0,
            b1: -2.0 * cos_w0 / a0,
            b2: (1.0 - alpha * amplitude) / a0,
            a1: -2.0 * cos_w0 / a0,
            a2: (1.0 - alpha / amplitude) / a0,
        }
    }
}

#[derive(Debug, Clone, Copy, Default)]
struct BiquadState {
    z1: f64,
    z2: f64,
}

impl BiquadState {
    fn process(&mut self, c: &Coefficients, x: f64) -> f64 {
        let y = c.b0 * x + self.z1;
        self.z1 = c.b1 * x - c.a1 * y + self.z2;
        self.z2 = c.b2 * x - c.a2 * y;
        y
    }

    fn flush_below_floor(&mut self) -> bool {
        for z in [&mut self.z1, &mut self.z2] {
            if z.abs() < STATE_FLOOR {
                *z = 0.0;
            }
        }
        self.z1 == 0.0 && self.z2 == 0.0
    }
}

pub struct Equalizer {
    shared: Arc<SharedEqualizer>,
    seen_version: u64,
    sample_rate: f64,
    channels: usize,
    bypassed: bool,
    draining: bool,
    band_active: [bool; BAND_COUNT],
    coefficients: [Coefficients; BAND_COUNT],
    states: Vec<[BiquadState; BAND_COUNT]>,
}

impl Equalizer {
    pub fn new(shared: Arc<SharedEqualizer>, sample_rate: u32, channels: u16) -> Self {
        let rate = f64::from(sample_rate);
        let channels = usize::from(channels.max(1));
        let band_active = std::array::from_fn(|band| sample_rate > 0 && f64::from(BAND_FREQUENCIES_HZ[band]) < rate / 2.0 * NYQUIST_GUARD);
        let (seen_version, params) = shared.snapshot();
        let mut equalizer = Self {
            shared,
            seen_version,
            sample_rate: rate,
            channels,
            bypassed: true,
            draining: false,
            band_active,
            coefficients: [Coefficients::IDENTITY; BAND_COUNT],
            states: vec![[BiquadState::default(); BAND_COUNT]; channels],
        };
        equalizer.configure(params);
        log::info!(
            "[player::equalizer] Track equalizer ready: sample_rate={} channels={} active_bands={}/{} enabled={} bypassed={}",
            sample_rate,
            channels,
            band_active.iter().filter(|active| **active).count(),
            BAND_COUNT,
            params.enabled,
            equalizer.bypassed
        );
        equalizer
    }

    pub fn process(&mut self, samples: &mut [f32]) {
        if let Some((version, params)) = self.shared.try_snapshot_since(self.seen_version) {
            self.seen_version = version;
            self.configure(params);
        }
        if self.bypassed {
            return;
        }
        for frame in samples.chunks_exact_mut(self.channels) {
            self.process_frame(frame);
        }
        if self.settle_states() && self.draining {
            self.bypassed = true;
            self.draining = false;
        }
    }

    fn settle_states(&mut self) -> bool {
        let mut settled = true;
        for state in self.states.iter_mut().flat_map(|bands| bands.iter_mut()) {
            settled &= state.flush_below_floor();
        }
        settled
    }

    fn process_frame(&mut self, frame: &mut [f32]) {
        for (sample, bands) in frame.iter_mut().zip(self.states.iter_mut()) {
            let mut value = f64::from(*sample);
            for ((state, coefficients), active) in bands.iter_mut().zip(&self.coefficients).zip(&self.band_active) {
                if *active {
                    value = state.process(coefficients, value);
                }
            }
            *sample = value as f32;
        }
    }

    fn configure(&mut self, params: EqualizerParams) {
        let mut any_gain = false;
        let bands = self.coefficients.iter_mut().zip(self.band_active).zip(BAND_FREQUENCIES_HZ).zip(params.gains_db);
        for (((coefficients, active), center_hz), gain_db) in bands {
            if !active {
                *coefficients = Coefficients::IDENTITY;
                continue;
            }
            let gain_db = if params.enabled { gain_db } else { 0.0 };
            any_gain |= gain_db != 0.0;
            *coefficients = Coefficients::peaking(self.sample_rate, f64::from(center_hz), f64::from(gain_db));
        }
        if any_gain {
            self.bypassed = false;
        }
        self.draining = !any_gain && !self.bypassed;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_ids_match_their_serde_names() {
        for preset in EqualizerPreset::BUILT_IN.into_iter().chain([EqualizerPreset::Custom]) {
            assert_eq!(serde_json::to_string(&preset).unwrap(), format!("\"{}\"", preset.id()));
        }
        assert_eq!(serde_json::to_string(&EqualizerPreset::BassBoost).unwrap(), "\"bassBoost\"");
    }

    #[test]
    fn built_in_ids_parse_and_custom_or_unknown_are_rejected() {
        assert_eq!(EqualizerPreset::from_built_in_id("rock"), Some(EqualizerPreset::Rock));
        assert_eq!(EqualizerPreset::from_built_in_id("trebleBoost"), Some(EqualizerPreset::TrebleBoost));
        assert_eq!(EqualizerPreset::from_built_in_id("custom"), None);
        assert_eq!(EqualizerPreset::from_built_in_id(""), None);
        assert_eq!(EqualizerPreset::from_built_in_id("Rock"), None);
    }

    #[test]
    fn built_in_order_is_stable() {
        let ids: Vec<_> = EqualizerPreset::BUILT_IN.iter().map(|preset| preset.id()).collect();
        assert_eq!(ids, vec!["flat", "bassBoost", "trebleBoost", "vocal", "electronic", "rock", "acoustic"]);
    }

    #[test]
    fn settings_deserialize_from_camel_case() {
        let settings: EqualizerSettings = serde_json::from_str(r#"{"enabled":true,"gainsDb":[1.5,-2]}"#).unwrap();
        assert_eq!(settings, EqualizerSettings { enabled: true, gains_db: vec![1.5, -2.0] });
    }

    #[test]
    fn band_layout_matches_the_frontend() {
        assert_eq!(BAND_FREQUENCIES_HZ[..], [60.0, 230.0, 910.0, 3600.0, 14000.0]);
        assert_eq!(MAX_GAIN_DB, 6.0);
    }

    #[test]
    fn normalized_pads_clamps_and_drops_non_finite_gains() {
        let settings = EqualizerSettings { enabled: true, gains_db: vec![20.0, -6.5, f32::NAN, f32::INFINITY] };
        let params = settings.normalized();
        assert!(params.enabled);
        assert_eq!(params.gains_db[..], [6.0, -6.0, 0.0, 0.0, 0.0]);
    }

    #[test]
    fn normalized_ignores_extra_gains() {
        let params = EqualizerSettings { enabled: false, gains_db: vec![1.0; 10] }.normalized();
        assert_eq!(params.gains_db, [1.0; BAND_COUNT]);
        assert!(!params.enabled);
    }

    #[test]
    fn params_bypass_when_disabled_or_flat() {
        assert!(EqualizerParams::default().is_bypassed());
        assert!(EqualizerParams { enabled: true, gains_db: [0.0; BAND_COUNT] }.is_bypassed());
        assert!(EqualizerParams { enabled: false, gains_db: [6.0; BAND_COUNT] }.is_bypassed());
        assert!(!EqualizerParams { enabled: true, gains_db: [6.0; BAND_COUNT] }.is_bypassed());
    }

    #[test]
    fn shared_reports_changes_once_per_version() {
        let shared = SharedEqualizer::default();
        let (initial, params) = shared.snapshot();
        assert_eq!(params, EqualizerParams::default());
        assert_eq!(shared.try_snapshot_since(initial), None);

        let updated = EqualizerParams { enabled: true, gains_db: [3.0; BAND_COUNT] };
        shared.set(updated);
        let (version, seen) = shared.try_snapshot_since(initial).expect("change should be visible");
        assert_eq!(seen, updated);
        assert_ne!(version, initial);
        assert_eq!(shared.try_snapshot_since(version), None);
    }

    const CHUNK: usize = 2048;

    fn shared(enabled: bool, gains_db: [f32; BAND_COUNT]) -> Arc<SharedEqualizer> {
        let shared = Arc::new(SharedEqualizer::default());
        shared.set(EqualizerParams { enabled, gains_db });
        shared
    }

    fn with_gain(band: usize, gain_db: f32) -> [f32; BAND_COUNT] {
        let mut gains = [0.0; BAND_COUNT];
        gains[band] = gain_db;
        gains
    }

    fn sine(frequency: f64, sample_rate: u32, channels: usize, frames: usize) -> Vec<f32> {
        (0..frames)
            .flat_map(|n| {
                let value = (0.25 * (2.0 * PI * frequency * n as f64 / f64::from(sample_rate)).sin()) as f32;
                std::iter::repeat(value).take(channels)
            })
            .collect()
    }

    fn run(equalizer: &mut Equalizer, input: &[f32]) -> Vec<f32> {
        let mut output = input.to_vec();
        for chunk in output.chunks_mut(CHUNK) {
            equalizer.process(chunk);
        }
        output
    }

    fn rms(samples: &[f32], channels: usize) -> f64 {
        let values: Vec<f64> = samples.iter().step_by(channels).map(|s| f64::from(*s)).collect();
        (values.iter().map(|v| v * v).sum::<f64>() / values.len() as f64).sqrt()
    }

    fn level_change_db(input: &[f32], output: &[f32], channels: usize) -> f64 {
        let settle = input.len() / 4 / channels * channels;
        20.0 * (rms(&output[settle..], channels) / rms(&input[settle..], channels)).log10()
    }

    #[test]
    fn flat_enabled_equalizer_is_bit_exact() {
        let input = sine(440.0, 48_000, 2, 4_800);
        let mut equalizer = Equalizer::new(shared(true, [0.0; BAND_COUNT]), 48_000, 2);
        assert_eq!(run(&mut equalizer, &input), input);
    }

    #[test]
    fn disabled_equalizer_bypasses_even_with_gains() {
        let input = sine(1000.0, 48_000, 2, 4_800);
        let mut equalizer = Equalizer::new(shared(false, [MAX_GAIN_DB; BAND_COUNT]), 48_000, 2);
        assert_eq!(run(&mut equalizer, &input), input);
    }

    #[test]
    fn boost_at_band_center_plays_at_full_level_at_44_1k_and_48k() {
        for sample_rate in [44_100, 48_000] {
            let shared = shared(true, with_gain(2, 6.0));
            let at_center = sine(910.0, sample_rate, 2, sample_rate as usize);
            let far_below = sine(60.0, sample_rate, 2, sample_rate as usize);
            let center_change = level_change_db(&at_center, &run(&mut Equalizer::new(shared.clone(), sample_rate, 2), &at_center), 2);
            let far_change = level_change_db(&far_below, &run(&mut Equalizer::new(shared.clone(), sample_rate, 2), &far_below), 2);
            assert!((center_change - 6.0).abs() < 0.5, "{sample_rate} Hz: 910 Hz change {center_change:.2} dB");
            assert!(far_change.abs() < 0.5, "{sample_rate} Hz: 60 Hz change {far_change:.2} dB");
        }
    }

    #[test]
    fn band_reaches_half_its_gain_one_octave_away_so_neighbours_blend() {
        let shared = shared(true, with_gain(2, 6.0));
        for frequency in [455.0, 1820.0] {
            let input = sine(frequency, 48_000, 1, 48_000);
            let change = level_change_db(&input, &run(&mut Equalizer::new(shared.clone(), 48_000, 1), &input), 1);
            assert!((change - 3.0).abs() < 0.5, "{frequency} Hz change {change:.2} dB");
        }
    }

    #[test]
    fn cut_at_band_center_lowers_that_band() {
        let input = sine(910.0, 48_000, 1, 48_000);
        let mut equalizer = Equalizer::new(shared(true, with_gain(2, -6.0)), 48_000, 1);
        let change = level_change_db(&input, &run(&mut equalizer, &input), 1);
        assert!((change + 6.0).abs() < 0.5, "910 Hz change {change:.2} dB");
    }

    #[test]
    fn bands_near_nyquist_are_inactive() {
        let input = sine(1000.0, 22_050, 2, 4_410);
        let mut equalizer = Equalizer::new(shared(true, with_gain(BAND_COUNT - 1, MAX_GAIN_DB)), 22_050, 2);
        assert_eq!(run(&mut equalizer, &input), input);
    }

    #[test]
    fn channels_have_independent_filter_state() {
        let mut input = sine(1000.0, 48_000, 2, 4_800);
        input.iter_mut().skip(1).step_by(2).for_each(|s| *s = 0.0);
        let mut equalizer = Equalizer::new(shared(true, [6.0; BAND_COUNT]), 48_000, 2);
        let output = run(&mut equalizer, &input);
        assert!(output.iter().skip(1).step_by(2).all(|s| *s == 0.0));
        assert!(output.iter().step_by(2).any(|s| *s != 0.0));
    }

    #[test]
    fn live_updates_apply_on_the_next_chunk_and_stay_bounded() {
        let shared = shared(true, with_gain(2, 6.0));
        let mut equalizer = Equalizer::new(shared.clone(), 48_000, 2);
        let mut output = sine(910.0, 48_000, 2, 48_000);
        let (first, second) = output.split_at_mut(48_000);
        for chunk in first.chunks_mut(CHUNK) {
            equalizer.process(chunk);
        }
        shared.set(EqualizerParams { enabled: true, gains_db: [-MAX_GAIN_DB; BAND_COUNT] });
        for chunk in second.chunks_mut(CHUNK) {
            equalizer.process(chunk);
        }
        assert!(output.iter().all(|s| s.is_finite() && s.abs() <= 1.0));
        assert!(rms(&output[72_000..], 2) < rms(&output[24_000..48_000], 2) * 0.5);
    }

    fn max_step(samples: &[f32], channels: usize) -> f32 {
        let left: Vec<f32> = samples.iter().step_by(channels).copied().collect();
        left.windows(2).map(|pair| (pair[1] - pair[0]).abs()).fold(0.0, f32::max)
    }

    #[test]
    fn disabling_drains_smoothly_then_becomes_bit_exact() {
        let shared = shared(true, with_gain(0, MAX_GAIN_DB));
        let mut equalizer = Equalizer::new(shared.clone(), 48_000, 2);
        let input = sine(62.25, 48_000, 2, 96_000);
        let mut output = input.clone();
        let (active, rest) = output.split_at_mut(96_000);
        for chunk in active.chunks_mut(CHUNK) {
            equalizer.process(chunk);
        }
        shared.set(EqualizerParams { enabled: false, gains_db: with_gain(0, MAX_GAIN_DB) });
        for chunk in rest.chunks_mut(CHUNK) {
            equalizer.process(chunk);
        }
        let around_switch = &output[94_000..98_000];
        let step = max_step(around_switch, 2);
        assert!(step < 0.01, "disable should not jump, max step {step}");
        assert!(equalizer.bypassed, "equalizer should settle into bypass");
        assert_eq!(output[output.len() - CHUNK..], input[input.len() - CHUNK..]);
    }

    #[test]
    fn re_enabling_while_draining_resumes_shaping() {
        let shared = shared(true, with_gain(2, -6.0));
        let mut equalizer = Equalizer::new(shared.clone(), 48_000, 1);
        let input = sine(910.0, 48_000, 1, 48_000);
        run(&mut equalizer, &input[..CHUNK]);
        shared.set(EqualizerParams { enabled: false, gains_db: with_gain(2, -6.0) });
        run(&mut equalizer, &input[..CHUNK]);
        shared.set(EqualizerParams { enabled: true, gains_db: with_gain(2, -6.0) });
        let change = level_change_db(&input, &run(&mut equalizer, &input), 1);
        assert!(!equalizer.bypassed && !equalizer.draining);
        assert!((change + 6.0).abs() < 0.5, "910 Hz change {change:.2} dB");
    }

    #[test]
    fn silent_input_flushes_filter_state_to_zero() {
        let mut equalizer = Equalizer::new(shared(true, [6.0; BAND_COUNT]), 48_000, 2);
        run(&mut equalizer, &sine(60.0, 48_000, 2, 4_800));
        let silence = vec![0.0; 48_000 * 2 * 10];
        run(&mut equalizer, &silence);
        let states_are_zero = equalizer.states.iter().flatten().all(|state| state.z1 == 0.0 && state.z2 == 0.0);
        assert!(states_are_zero, "filter state should be flushed instead of decaying into subnormals");
    }
}
