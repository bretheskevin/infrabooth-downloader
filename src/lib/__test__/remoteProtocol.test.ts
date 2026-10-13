import { describe, expect, it } from 'vitest';
import { DEFAULT_VISUALIZER_SETTINGS, sanitizeVisualizerSettings } from '../remote-protocol';

describe('sanitizeVisualizerSettings', () => {
  it('keeps a fully valid object', () => {
    const valid = { style: 'wave', showTrackInfo: false, blurredBackground: false, artworkColor: true };
    expect(sanitizeVisualizerSettings(valid)).toEqual(valid);
  });

  it('fills missing fields with defaults', () => {
    expect(sanitizeVisualizerSettings({ style: 'radial' })).toEqual({ ...DEFAULT_VISUALIZER_SETTINGS, style: 'radial' });
  });

  it.each([undefined, null, 42, 'bars', '{"style":"wave"}', []])('returns defaults for non-object %j', (garbage) => {
    expect(sanitizeVisualizerSettings(garbage)).toEqual(DEFAULT_VISUALIZER_SETTINGS);
  });

  it('falls back per field on wrong types and unknown styles', () => {
    expect(sanitizeVisualizerSettings({ style: 'laser', showTrackInfo: 'yes', blurredBackground: 0, artworkColor: true })).toEqual({
      ...DEFAULT_VISUALIZER_SETTINGS,
      artworkColor: true,
    });
  });

  it('returns a fresh object, never the shared defaults', () => {
    expect(sanitizeVisualizerSettings(null)).not.toBe(DEFAULT_VISUALIZER_SETTINGS);
  });
});
