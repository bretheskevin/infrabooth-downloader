import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('hls.js', () => {
  const mockHls = vi.fn().mockImplementation(() => ({
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    recoverMediaError: vi.fn(),
  }));
  return {
    default: Object.assign(mockHls, {
      isSupported: vi.fn().mockReturnValue(false),
      Events: {
        MANIFEST_PARSED: 'hlsManifestParsed',
        BUFFER_EOS: 'hlsBufferEos',
        ERROR: 'hlsError',
      },
      ErrorTypes: { MEDIA_ERROR: 'mediaError' },
    }),
  };
});

window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

import { audioEngine } from '../audio-engine';

describe('audioEngine', () => {
  beforeEach(() => {
    audioEngine.destroy();
  });

  it('starts in idle state', () => {
    expect(audioEngine.getState()).toBe('idle');
  });

  it('reports zero position when idle', () => {
    expect(audioEngine.getPosition()).toEqual({ positionMs: 0, durationMs: 0 });
  });

  it('isCrossfading returns false by default', () => {
    expect(audioEngine.isCrossfading()).toBe(false);
  });

  describe('preloadNext', () => {
    it('does not throw when called', () => {
      expect(() => audioEngine.preloadNext('https://example.com/next.m3u8')).not.toThrow();
    });
  });

  describe('cancelCrossfade', () => {
    it('is safe to call when not crossfading', () => {
      expect(() => audioEngine.cancelCrossfade()).not.toThrow();
    });

    it('reverts to outgoing track when called during active crossfade', () => {
      audioEngine.load('https://example.com/track-a');
      audioEngine.preloadNext('https://example.com/track-b');

      audioEngine.startCrossfade(3000, 1);
      audioEngine.cancelCrossfade();

      expect(audioEngine.isCrossfading()).toBe(false);
      expect(audioEngine.getState()).not.toBe('idle');
    });
  });

  describe('settleCrossfade', () => {
    it('is safe to call when not crossfading', () => {
      expect(() => audioEngine.settleCrossfade()).not.toThrow();
    });
  });

  describe('setVolume', () => {
    it('clamps out-of-range values without throwing', () => {
      audioEngine.load('https://example.com/stream');
      expect(() => audioEngine.setVolume(-0.5)).not.toThrow();
      expect(() => audioEngine.setVolume(1.5)).not.toThrow();
      expect(audioEngine.getState()).toBe('loading');
    });
  });

  describe('destroy', () => {
    it('cleans up both slots', () => {
      audioEngine.load('https://example.com/stream');
      audioEngine.preloadNext('https://example.com/next');
      audioEngine.destroy();
      expect(audioEngine.getState()).toBe('idle');
      expect(audioEngine.isCrossfading()).toBe(false);
    });
  });
});
