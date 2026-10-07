import type { EqualizerPreset } from '@/bindings';
import { clamp } from '@/lib/utils';

export type BuiltInEqualizerPreset = Exclude<EqualizerPreset, 'custom'>;

export const EQUALIZER_BAND_FREQUENCIES = [60, 230, 910, 3600, 14000] as const;
export const EQUALIZER_MAX_GAIN_DB = 6;
export const EQUALIZER_GAIN_STEP_DB = 0.5;

export const BUILT_IN_EQUALIZER_PRESETS: readonly BuiltInEqualizerPreset[] = [
  'flat',
  'bassBoost',
  'trebleBoost',
  'vocal',
  'electronic',
  'rock',
  'acoustic',
];

const PRESET_GAINS: Record<BuiltInEqualizerPreset, readonly number[]> = {
  flat: [0, 0, 0, 0, 0],
  bassBoost: [6, 3, 0, 0, 0],
  trebleBoost: [0, 0, 0, 3, 6],
  vocal: [-2, -1, 3, 4, 1],
  electronic: [5, 1, -2, 2, 5],
  rock: [4, 2, -2, 2, 4],
  acoustic: [3, 2, 1, 2, 2],
};

export function isBuiltInPreset(value: unknown): value is BuiltInEqualizerPreset {
  return BUILT_IN_EQUALIZER_PRESETS.some((preset) => preset === value);
}

export function presetGains(preset: BuiltInEqualizerPreset): number[] {
  return [...PRESET_GAINS[preset]];
}

export function clampGain(db: number): number {
  if (!Number.isFinite(db)) return 0;
  const snapped = Math.round(db / EQUALIZER_GAIN_STEP_DB) * EQUALIZER_GAIN_STEP_DB;
  return clamp(snapped, -EQUALIZER_MAX_GAIN_DB, EQUALIZER_MAX_GAIN_DB) || 0;
}

export function matchPreset(gains: readonly number[]): EqualizerPreset {
  return BUILT_IN_EQUALIZER_PRESETS.find((preset) => PRESET_GAINS[preset].every((gain, i) => gain === gains[i])) ?? 'custom';
}

export function sanitizeGains(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== EQUALIZER_BAND_FREQUENCIES.length) return null;
  if (!value.every((gain) => typeof gain === 'number' && Number.isFinite(gain))) return null;
  return value.map(clampGain);
}

export function formatBandFrequency(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : String(hz);
}

export function formatGain(db: number): string {
  return db > 0 ? `+${db}` : String(db);
}
