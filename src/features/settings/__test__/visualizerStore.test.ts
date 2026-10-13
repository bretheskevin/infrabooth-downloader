import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_VISUALIZER_SETTINGS } from '@/lib/remote-protocol';
import { useSettingsStore } from '../store';

const STORAGE_KEY = 'sc-downloader-settings';

async function rehydrateWith(state: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }));
  await useSettingsStore.persist.rehydrate();
}

describe('settings store — visualizer', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({ visualizerSettings: { ...DEFAULT_VISUALIZER_SETTINGS } });
  });

  it('defaults to the default visualizer settings', () => {
    expect(useSettingsStore.getInitialState().visualizerSettings).toEqual(DEFAULT_VISUALIZER_SETTINGS);
  });

  it('updates and persists the visualizer settings', () => {
    const next = { ...DEFAULT_VISUALIZER_SETTINGS, style: 'wave' as const, artworkColor: true };
    useSettingsStore.getState().setVisualizerSettings(next);
    expect(useSettingsStore.getState().visualizerSettings).toEqual(next);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.state.visualizerSettings).toEqual(next);
  });

  it('keeps valid persisted visualizer settings on rehydrate', async () => {
    const persisted = { style: 'radial', showTrackInfo: false, blurredBackground: true, artworkColor: true };
    await rehydrateWith({ visualizerSettings: persisted });
    expect(useSettingsStore.getState().visualizerSettings).toEqual(persisted);
  });

  it('sanitizes garbage persisted visualizer settings on rehydrate', async () => {
    await rehydrateWith({ visualizerSettings: { style: 'laser', showTrackInfo: 'no' } });
    expect(useSettingsStore.getState().visualizerSettings).toEqual(DEFAULT_VISUALIZER_SETTINGS);
  });

  it('falls back to defaults for settings persisted before the visualizer existed', async () => {
    await rehydrateWith({ theme: 'dark' });
    expect(useSettingsStore.getState().visualizerSettings).toEqual(DEFAULT_VISUALIZER_SETTINGS);
  });
});
