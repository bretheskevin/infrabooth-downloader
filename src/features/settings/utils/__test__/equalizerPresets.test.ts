import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_EQUALIZER_PRESETS,
  EQUALIZER_BAND_FREQUENCIES,
  EQUALIZER_MAX_GAIN_DB,
  clampGain,
  formatBandFrequency,
  formatGain,
  isBuiltInPreset,
  matchPreset,
  presetGains,
  sanitizeGains,
} from '../equalizerPresets';

describe('equalizer presets', () => {
  it('defines 5 bands about two octaves apart, matching Rust', () => {
    expect(EQUALIZER_BAND_FREQUENCIES).toEqual([60, 230, 910, 3600, 14000]);
  });

  it('keeps the built-in order shared with Rust', () => {
    expect(BUILT_IN_EQUALIZER_PRESETS).toEqual(['flat', 'bassBoost', 'trebleBoost', 'vocal', 'electronic', 'rock', 'acoustic']);
  });

  it('limits gains to ±6 dB', () => {
    expect(EQUALIZER_MAX_GAIN_DB).toBe(6);
  });

  it('gives every built-in preset one gain per band within the gain range', () => {
    for (const preset of BUILT_IN_EQUALIZER_PRESETS) {
      const gains = presetGains(preset);
      expect(gains).toHaveLength(EQUALIZER_BAND_FREQUENCIES.length);
      expect(gains.every((g) => Math.abs(g) <= EQUALIZER_MAX_GAIN_DB)).toBe(true);
    }
  });

  it('keeps presets distinct so matching is unambiguous', () => {
    const unique = new Set(BUILT_IN_EQUALIZER_PRESETS.map((p) => JSON.stringify(presetGains(p))));
    expect(unique.size).toBe(BUILT_IN_EQUALIZER_PRESETS.length);
  });

  it('returns a fresh copy of preset gains', () => {
    const gains = presetGains('rock');
    gains[0] = 99;
    expect(presetGains('rock')[0]).toBe(4);
  });

  it('matches built-in presets and falls back to custom', () => {
    expect(matchPreset(Array(EQUALIZER_BAND_FREQUENCIES.length).fill(0))).toBe('flat');
    expect(matchPreset([6, 3, 0, 0, 0])).toBe('bassBoost');
    expect(matchPreset([6, 3, 0, 0, 0.5])).toBe('custom');
  });

  it('recognises built-in preset ids only', () => {
    expect(isBuiltInPreset('rock')).toBe(true);
    expect(isBuiltInPreset('custom')).toBe(false);
    expect(isBuiltInPreset('loud')).toBe(false);
    expect(isBuiltInPreset(undefined)).toBe(false);
  });

  it('clamps to ±6 dB, snaps to 0.5 dB and rejects non-finite values', () => {
    expect(clampGain(20)).toBe(6);
    expect(clampGain(-20)).toBe(-6);
    expect(clampGain(6.2)).toBe(6);
    expect(clampGain(3.3)).toBe(3.5);
    expect(clampGain(3.2)).toBe(3);
    expect(clampGain(-0.1)).toBe(0);
    expect(clampGain(Number.NaN)).toBe(0);
    expect(clampGain(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('sanitizes persisted gains', () => {
    expect(sanitizeGains([30, -30, 1, 12, -10])).toEqual([6, -6, 1, 6, -6]);
    expect(sanitizeGains([1, 2])).toBeNull();
    expect(sanitizeGains(Array(10).fill(0))).toBeNull();
    expect(sanitizeGains('nope')).toBeNull();
    expect(sanitizeGains([0, 0, 0, 0, 'x'])).toBeNull();
    expect(sanitizeGains([0, 0, 0, 0, Number.NaN])).toBeNull();
  });

  it('formats frequencies and gains', () => {
    expect(formatBandFrequency(60)).toBe('60');
    expect(formatBandFrequency(910)).toBe('910');
    expect(formatBandFrequency(3600)).toBe('3.6k');
    expect(formatBandFrequency(14000)).toBe('14k');
    expect(formatGain(3.5)).toBe('+3.5');
    expect(formatGain(0)).toBe('0');
    expect(formatGain(-2)).toBe('-2');
  });
});
