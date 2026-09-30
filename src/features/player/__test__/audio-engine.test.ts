import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
        FRAG_LOADED: 'hlsFragLoaded',
      },
      ErrorTypes: { MEDIA_ERROR: 'mediaError', NETWORK_ERROR: 'networkError' },
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

  describe('isFullyBuffered', () => {
    const mockBuffered = (endS: number): TimeRanges => ({ length: 1, start: () => 0, end: () => endS }) as unknown as TimeRanges;

    it('returns false when no track is loaded', () => {
      expect(audioEngine.isFullyBuffered()).toBe(false);
    });

    it('returns true when the buffered range spans the current position to the duration', () => {
      audioEngine.load('https://example.com/stream');
      const bufferedSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'buffered', 'get').mockReturnValue(mockBuffered(180));
      const durationSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(180);

      expect(audioEngine.isFullyBuffered()).toBe(true);

      bufferedSpy.mockRestore();
      durationSpy.mockRestore();
    });

    it('returns false when the buffered range ends before the duration', () => {
      audioEngine.load('https://example.com/stream');
      const bufferedSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'buffered', 'get').mockReturnValue(mockBuffered(90));
      const durationSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(180);

      expect(audioEngine.isFullyBuffered()).toBe(false);

      bufferedSpy.mockRestore();
      durationSpy.mockRestore();
    });
  });

  describe('HLS error handling', () => {
    let hlsInstance: {
      on: ReturnType<typeof vi.fn>;
      loadSource: ReturnType<typeof vi.fn>;
      attachMedia: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
      recoverMediaError: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      const Hls = (await import('hls.js')).default;
      vi.mocked(Hls.isSupported).mockReturnValue(true);

      hlsInstance = {
        on: vi.fn(),
        loadSource: vi.fn(),
        attachMedia: vi.fn(),
        destroy: vi.fn(),
        recoverMediaError: vi.fn(),
      };
      // Must use `function` keyword so `new Hls()` works as a constructor
      vi.mocked(Hls).mockImplementation(function () {
        return hlsInstance as unknown as InstanceType<typeof Hls>;
      } as unknown as typeof Hls);
    });

    afterEach(async () => {
      const Hls = (await import('hls.js')).default;
      vi.mocked(Hls.isSupported).mockReturnValue(false);
      audioEngine.destroy();
    });

    function triggerHlsEvent(eventName: string, data: unknown) {
      const call = hlsInstance.on.mock.calls.find((args) => args[0] === eventName);
      if (call) call[1]('event', data);
    }

    it('should call onUrlExpired on fatal NETWORK_ERROR', async () => {
      const Hls = (await import('hls.js')).default;
      const onUrlExpired = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired });
      audioEngine.load('https://example.com/stream.m3u8');

      triggerHlsEvent(Hls.Events.ERROR, {
        fatal: true,
        type: Hls.ErrorTypes.NETWORK_ERROR,
        details: 'fragLoadError',
      });

      expect(onUrlExpired).toHaveBeenCalledWith(0);
    });

    it('should not call onUrlExpired twice without a new load', async () => {
      const Hls = (await import('hls.js')).default;
      const onUrlExpired = vi.fn();
      const onError = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired, onError });
      audioEngine.load('https://example.com/stream.m3u8');

      triggerHlsEvent(Hls.Events.ERROR, {
        fatal: true,
        type: Hls.ErrorTypes.NETWORK_ERROR,
        details: 'fragLoadError',
      });
      triggerHlsEvent(Hls.Events.ERROR, {
        fatal: true,
        type: Hls.ErrorTypes.NETWORK_ERROR,
        details: 'fragLoadError',
      });

      expect(onUrlExpired).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should recover from MEDIA_ERROR', async () => {
      const Hls = (await import('hls.js')).default;
      audioEngine.load('https://example.com/stream.m3u8');

      triggerHlsEvent(Hls.Events.ERROR, {
        fatal: true,
        type: Hls.ErrorTypes.MEDIA_ERROR,
        details: 'bufferStalledError',
      });

      expect(hlsInstance.recoverMediaError).toHaveBeenCalled();
    });

    it('escalates to onUrlExpired after 3 consecutive non-fatal NETWORK_ERRORs', async () => {
      const Hls = (await import('hls.js')).default;
      const onUrlExpired = vi.fn();
      const onError = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired, onError });
      audioEngine.load('https://example.com/stream.m3u8');

      for (let i = 0; i < 2; i++) {
        triggerHlsEvent(Hls.Events.ERROR, {
          fatal: false,
          type: Hls.ErrorTypes.NETWORK_ERROR,
          details: 'fragLoadError',
        });
      }
      expect(onUrlExpired).not.toHaveBeenCalled();

      triggerHlsEvent(Hls.Events.ERROR, {
        fatal: false,
        type: Hls.ErrorTypes.NETWORK_ERROR,
        details: 'fragLoadError',
      });
      expect(onUrlExpired).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('resets the non-fatal error counter on FRAG_LOADED', async () => {
      const Hls = (await import('hls.js')).default;
      const onUrlExpired = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired });
      audioEngine.load('https://example.com/stream.m3u8');

      for (let i = 0; i < 2; i++) {
        triggerHlsEvent(Hls.Events.ERROR, {
          fatal: false,
          type: Hls.ErrorTypes.NETWORK_ERROR,
          details: 'fragLoadError',
        });
      }
      triggerHlsEvent(Hls.Events.FRAG_LOADED, {});
      for (let i = 0; i < 2; i++) {
        triggerHlsEvent(Hls.Events.ERROR, {
          fatal: false,
          type: Hls.ErrorTypes.NETWORK_ERROR,
          details: 'fragLoadError',
        });
      }

      expect(onUrlExpired).not.toHaveBeenCalled();
    });
  });

  describe('loading watchdog', () => {
    type Listener = () => void;

    class FakeAudioElement {
      listeners = new Map<string, Listener[]>();
      currentTime = 0;
      duration = 0;
      readyState = 0;
      paused = true;
      volume = 1;
      src = '';
      addEventListener(type: string, cb: Listener) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), cb]);
      }
      play() {
        this.paused = false;
        this.emit('playing');
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
        this.emit('pause');
      }
      load() {}
      removeAttribute() {}
      remove() {}
      emit(type: string) {
        for (const cb of this.listeners.get(type) ?? []) cb();
      }
    }

    let createdAudio: FakeAudioElement[];

    beforeEach(async () => {
      const Hls = (await import('hls.js')).default;
      vi.mocked(Hls.isSupported).mockReturnValue(true);
      vi.useFakeTimers();
      createdAudio = [];
      vi.stubGlobal(
        'Audio',
        vi.fn().mockImplementation(function () {
          const el = new FakeAudioElement();
          createdAudio.push(el);
          return el;
        }),
      );
    });

    afterEach(async () => {
      audioEngine.destroy();
      vi.unstubAllGlobals();
      vi.useRealTimers();
      const Hls = (await import('hls.js')).default;
      vi.mocked(Hls.isSupported).mockReturnValue(false);
    });

    it('fires onUrlExpired with the current position after 5s stuck in loading', () => {
      const onUrlExpired = vi.fn();
      const onError = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired, onError });
      audioEngine.load('https://example.com/stream.m3u8');
      createdAudio[0]!.currentTime = 12;

      vi.advanceTimersByTime(5000);

      expect(onUrlExpired).toHaveBeenCalledTimes(1);
      expect(onUrlExpired).toHaveBeenCalledWith(12000);
      expect(onError).not.toHaveBeenCalled();
      expect(audioEngine.getState()).toBe('loading');
    });

    it('fires onError and returns to idle after a second 5s stall', () => {
      const onUrlExpired = vi.fn();
      const onError = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired, onError });
      audioEngine.load('https://example.com/stream.m3u8');

      vi.advanceTimersByTime(5000);
      vi.advanceTimersByTime(5000);

      expect(onUrlExpired).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith('Loading stalled after URL refresh');
      expect(audioEngine.getState()).toBe('idle');
    });

    it('restarts the watchdog cycle when a URL refresh triggers a fresh load', () => {
      const onError = vi.fn();
      const onUrlExpired = vi.fn(() => {
        audioEngine.load('https://example.com/stream.m3u8');
      });
      audioEngine.setCallbacks({ onUrlExpired, onError });
      audioEngine.load('https://example.com/stream.m3u8');

      vi.advanceTimersByTime(5000);
      vi.advanceTimersByTime(5000);

      expect(onUrlExpired).toHaveBeenCalledTimes(2);
      expect(onError).not.toHaveBeenCalled();
      expect(audioEngine.getState()).toBe('loading');
    });

    it('does not fire when playback starts before 5s', () => {
      const onUrlExpired = vi.fn();
      const onError = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired, onError });
      audioEngine.load('https://example.com/stream.m3u8');

      createdAudio[0]!.emit('playing');
      vi.advanceTimersByTime(10000);

      expect(onUrlExpired).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('does not fire when the track is paused', () => {
      const onUrlExpired = vi.fn();
      const onError = vi.fn();
      audioEngine.setCallbacks({ onUrlExpired, onError });
      audioEngine.load('https://example.com/stream.m3u8');

      audioEngine.pause();
      vi.advanceTimersByTime(10000);

      expect(onUrlExpired).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
