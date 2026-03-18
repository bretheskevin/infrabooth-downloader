import Hls from 'hls.js';

export type AudioEngineState = 'idle' | 'loading' | 'playing' | 'paused';

export interface AudioEngineCallbacks {
  onStateChange: (state: AudioEngineState) => void;
  onProgress: (positionMs: number, durationMs: number) => void;
  onEnded: () => void;
  onError: (message: string) => void;
  onFullyBuffered: () => void;
}

const DEFAULT_CALLBACKS: AudioEngineCallbacks = {
  onStateChange: () => {},
  onProgress: () => {},
  onEnded: () => {},
  onError: () => {},
  onFullyBuffered: () => {},
};

let audio: HTMLAudioElement | null = null;
let hls: Hls | null = null;
let callbacks: AudioEngineCallbacks = { ...DEFAULT_CALLBACKS };
let progressInterval: ReturnType<typeof setInterval> | null = null;
let currentState: AudioEngineState = 'idle';

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.addEventListener('playing', () => setState('playing'));
    audio.addEventListener('pause', () => {
      if (currentState !== 'idle') setState('paused');
    });
    audio.addEventListener('waiting', () => {
      if (currentState === 'playing') setState('loading');
    });
    audio.addEventListener('ended', () => {
      stopProgress();
      callbacks.onEnded();
    });
    audio.addEventListener('error', () => {
      const msg = audio?.error?.message ?? 'Unknown audio error';
      stopProgress();
      setState('idle');
      callbacks.onError(msg);
    });
  }
  return audio;
}

function setState(state: AudioEngineState) {
  currentState = state;
  callbacks.onStateChange(state);
}

function startProgress() {
  stopProgress();
  progressInterval = setInterval(() => {
    if (!audio) return;
    callbacks.onProgress(
      audio.currentTime * 1000,
      (audio.duration || 0) * 1000,
    );
  }, 250);
}

function stopProgress() {
  if (progressInterval !== null) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function destroyHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

export const audioEngine = {
  setCallbacks(cb: Partial<AudioEngineCallbacks>) {
    callbacks = { ...DEFAULT_CALLBACKS, ...cb };
  },

  load(url: string) {
    const el = getAudio();
    stopProgress();
    destroyHls();
    setState('loading');

    // Always use hls.js for HLS streams (all platforms).
    // Native HLS on macOS triggers AVPlayer which auto-registers with Now Playing,
    // causing duplicate media control entries. hls.js decodes in JS, avoiding this.
    if (Hls.isSupported()) {
      hls = new Hls({
        startPosition: 0, // VOD content: start from beginning
        maxBufferLength: 300, // 5 min forward buffer
        backBufferLength: 30, // evict played content beyond 30s
      });
      hls.loadSource(url);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        startProgress();
      });
      hls.on(Hls.Events.BUFFER_EOS, () => {
        callbacks.onFullyBuffered();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          stopProgress();
          setState('idle');
          callbacks.onError(`HLS error: ${data.type} - ${data.details}`);
        }
      });
      return;
    }

    // Fallback: try direct (unlikely to work for HLS)
    el.src = url;
    el.load();
    startProgress();
  },

  play() {
    getAudio().play().catch((e: Error) => {
      callbacks.onError(`Play failed: ${e.message}`);
    });
  },

  pause() {
    getAudio().pause();
  },

  resume() {
    audioEngine.play();
  },

  seek(positionMs: number) {
    const el = getAudio();
    el.currentTime = positionMs / 1000;
  },

  setVolume(volume: number) {
    getAudio().volume = Math.max(0, Math.min(1, volume));
  },

  stop() {
    stopProgress();
    destroyHls();
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setState('idle');
  },

  getState(): AudioEngineState {
    return currentState;
  },

  getPosition(): { positionMs: number; durationMs: number } {
    if (!audio) return { positionMs: 0, durationMs: 0 };
    return {
      positionMs: audio.currentTime * 1000,
      durationMs: (audio.duration || 0) * 1000,
    };
  },

  destroy() {
    audioEngine.stop();
    if (audio) {
      audio.remove();
      audio = null;
    }
  },
};
