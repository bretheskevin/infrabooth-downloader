import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../store';
import { EQUALIZER_BAND_FREQUENCIES } from '../utils/equalizerPresets';

const BAND_COUNT = EQUALIZER_BAND_FREQUENCIES.length;
const FLAT = Array(BAND_COUNT).fill(0);
const LEGACY_TEN_BANDS = [6, 5, 4, 2, 0, 0, 0, 0, 0, 0];
const STORAGE_KEY = 'sc-downloader-settings';

async function rehydrateWith(state: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }));
  await useSettingsStore.persist.rehydrate();
}

describe('settings store — equalizer', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({ equalizerEnabled: false, equalizerPreset: 'flat', equalizerGains: [...FLAT] });
  });

  it('defaults to a disabled flat equalizer', () => {
    const { equalizerEnabled, equalizerPreset, equalizerGains } = useSettingsStore.getState();
    expect(equalizerEnabled).toBe(false);
    expect(equalizerPreset).toBe('flat');
    expect(equalizerGains).toEqual(FLAT);
  });

  it('toggles the equalizer', () => {
    useSettingsStore.getState().setEqualizerEnabled(true);
    expect(useSettingsStore.getState().equalizerEnabled).toBe(true);
  });

  it('selecting a preset overwrites the gains', () => {
    useSettingsStore.getState().setEqualizerPreset('bassBoost');
    expect(useSettingsStore.getState().equalizerPreset).toBe('bassBoost');
    expect(useSettingsStore.getState().equalizerGains).toEqual([6, 3, 0, 0, 0]);
  });

  it('ignores an explicit custom preset selection', () => {
    useSettingsStore.getState().setEqualizerPreset('rock');
    useSettingsStore.getState().setEqualizerPreset('custom');
    expect(useSettingsStore.getState().equalizerPreset).toBe('rock');
  });

  it('moving a band clamps, snaps and switches to custom', () => {
    const { setEqualizerBandGain } = useSettingsStore.getState();
    setEqualizerBandGain(0, 20);
    setEqualizerBandGain(1, 3.3);
    setEqualizerBandGain(2, -40);
    expect(useSettingsStore.getState().equalizerGains.slice(0, 3)).toEqual([6, 3.5, -6]);
    expect(useSettingsStore.getState().equalizerPreset).toBe('custom');
  });

  it('moving bands back onto a preset selects that preset', () => {
    useSettingsStore.getState().setEqualizerPreset('bassBoost');
    useSettingsStore.getState().setEqualizerBandGain(0, 3);
    expect(useSettingsStore.getState().equalizerPreset).toBe('custom');
    useSettingsStore.getState().setEqualizerBandGain(0, 6);
    expect(useSettingsStore.getState().equalizerPreset).toBe('bassBoost');
  });

  it('ignores out-of-range band indexes', () => {
    useSettingsStore.getState().setEqualizerBandGain(BAND_COUNT, 5);
    useSettingsStore.getState().setEqualizerBandGain(-1, 5);
    expect(useSettingsStore.getState().equalizerGains).toEqual(FLAT);
  });

  it('reset restores flat but keeps the enabled flag', () => {
    useSettingsStore.setState({ equalizerEnabled: true });
    useSettingsStore.getState().setEqualizerPreset('rock');
    useSettingsStore.getState().resetEqualizer();
    const state = useSettingsStore.getState();
    expect(state.equalizerPreset).toBe('flat');
    expect(state.equalizerGains).toEqual(FLAT);
    expect(state.equalizerEnabled).toBe(true);
  });

  it('persists the equalizer keys', () => {
    useSettingsStore.getState().setEqualizerEnabled(true);
    useSettingsStore.getState().setEqualizerPreset('vocal');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.state.equalizerEnabled).toBe(true);
    expect(stored.state.equalizerPreset).toBe('vocal');
    expect(stored.state.equalizerGains).toEqual([-2, -1, 3, 4, 1]);
  });

  it('re-derives the gains of a persisted built-in preset when the gains do not fit the bands', async () => {
    await rehydrateWith({ equalizerEnabled: true, equalizerPreset: 'rock', equalizerGains: LEGACY_TEN_BANDS });
    const state = useSettingsStore.getState();
    expect(state.equalizerGains).toEqual([4, 2, -2, 2, 4]);
    expect(state.equalizerPreset).toBe('rock');
    expect(state.equalizerEnabled).toBe(true);
  });

  it('falls back to flat when the gains do not fit and the persisted preset is custom', async () => {
    await rehydrateWith({ equalizerEnabled: true, equalizerPreset: 'custom', equalizerGains: LEGACY_TEN_BANDS });
    const state = useSettingsStore.getState();
    expect(state.equalizerGains).toEqual(FLAT);
    expect(state.equalizerPreset).toBe('flat');
    expect(state.equalizerEnabled).toBe(true);
  });

  it('falls back to flat when the gains are invalid and the persisted preset is unknown', async () => {
    await rehydrateWith({ equalizerPreset: 'loud', equalizerGains: [1, 2] });
    expect(useSettingsStore.getState().equalizerGains).toEqual(FLAT);
    expect(useSettingsStore.getState().equalizerPreset).toBe('flat');
  });

  it('coerces a non-boolean persisted enabled flag even when gains are invalid', async () => {
    await rehydrateWith({ equalizerEnabled: 'yes', equalizerGains: 'loud' });
    const state = useSettingsStore.getState();
    expect(state.equalizerEnabled).toBe(false);
    expect(state.equalizerGains).toEqual(FLAT);
  });

  it('clamps persisted gains and derives the preset from them', async () => {
    await rehydrateWith({ equalizerPreset: 'custom', equalizerGains: [6, 3, 0, 0, 0] });
    expect(useSettingsStore.getState().equalizerPreset).toBe('bassBoost');
    await rehydrateWith({ equalizerPreset: 'flat', equalizerGains: [12, -12, 0, 0, 0] });
    expect(useSettingsStore.getState().equalizerGains.slice(0, 2)).toEqual([6, -6]);
    expect(useSettingsStore.getState().equalizerPreset).toBe('custom');
  });
});
