import Hls from 'hls.js';
import { clamp } from '@/lib/utils';
import { logger } from '@/lib/logger';

export type AudioEngineState = 'idle' | 'loading' | 'playing' | 'paused';

export interface AudioEngineCallbacks {
  onStateChange: (state: AudioEngineState) => void;
  onProgress: (positionMs: number, durationMs: number) => void;
  onEnded: () => void;
  onError: (message: string) => void;
  onFullyBuffered: () => void;
  onCrossfadeComplete: () => void;
  onUrlExpired: (positionMs: number) => void;
}

const DEFAULT_CALLBACKS: AudioEngineCallbacks = {
  onStateChange: () => {},
  onProgress: () => {},
  onEnded: () => {},
  onError: () => {},
  onFullyBuffered: () => {},
  onCrossfadeComplete: () => {},
  onUrlExpired: () => {},
};

interface Slot {
  audio: HTMLAudioElement | null;
  hls: Hls | null;
  progressInterval: ReturnType<typeof setInterval> | null;
  isOutgoing: boolean;
}

function createSlot(): Slot {
  return {
    audio: null,
    hls: null,
    progressInterval: null,
    isOutgoing: false,
  };
}

let activeSlot: Slot = createSlot();
let standbySlot: Slot | null = null;
let callbacks: AudioEngineCallbacks = { ...DEFAULT_CALLBACKS };
let currentState: AudioEngineState = 'idle';
let crossfading = false;
let rampId: number | null = null;
let rampTargetVolume = 1;
let crossfadePendingBegin: (() => void) | null = null;
let playWhenReady = false;
let urlRefreshAttempted = false;

const BUFFERED_END_TOLERANCE_S = 0.5;

function safePlay(el: HTMLAudioElement, context = 'Play') {
  el.play().catch((e: Error) => {
    if (e.name === 'AbortError') {
      void logger.debug(`[audio-engine] ${context} aborted (track switch)`);
      return;
    }
    callbacks.onError(`${context} failed: ${e.message}`);
  });
}

function setState(state: AudioEngineState) {
  currentState = state;
  callbacks.onStateChange(state);
}

function getSlotAudio(slot: Slot): HTMLAudioElement {
  if (!slot.audio) {
    const el = new Audio();

    el.addEventListener('playing', () => {
      if (!slot.isOutgoing) {
        setState('playing');
        startSlotProgress(slot);
      }
    });
    el.addEventListener('pause', () => {
      if (!slot.isOutgoing && currentState !== 'idle') {
        setState('paused');
        stopSlotProgress(slot);
      }
    });
    el.addEventListener('waiting', () => {
      if (!slot.isOutgoing && currentState === 'playing') setState('loading');
    });
    el.addEventListener('seeked', () => {
      if (!slot.isOutgoing && currentState === 'loading' && slot.audio && !slot.audio.paused && slot.audio.readyState >= 3) {
        setState('playing');
      }
    });
    el.addEventListener('canplay', () => {
      if (!slot.isOutgoing && playWhenReady && slot === activeSlot) {
        playWhenReady = false;
        void logger.debug(`[audio-engine] Deferred play executing (readyState=${el.readyState})`);
        safePlay(el);
      }
    });
    el.addEventListener('ended', () => {
      if (!slot.isOutgoing) {
        stopSlotProgress(slot);
        callbacks.onEnded();
      }
    });
    el.addEventListener('error', () => {
      if (!slot.isOutgoing) {
        const msg = slot.audio?.error?.message ?? 'Unknown audio error';
        stopSlotProgress(slot);
        setState('idle');
        callbacks.onError(msg);
      }
    });

    slot.audio = el;
  }
  return slot.audio;
}

const HLS_CONFIG = {
  startPosition: 0,
  maxBufferLength: 300,
  maxMaxBufferLength: 600,
  backBufferLength: 30,
  maxBufferHole: 0.5,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 1000,
  manifestLoadingMaxRetry: 4,
  manifestLoadingRetryDelay: 1000,
  levelLoadingMaxRetry: 4,
  levelLoadingRetryDelay: 1000,
} as const;

function loadSlot(slot: Slot, url: string, startPositionMs = 0) {
  const el = getSlotAudio(slot);
  destroySlotHls(slot);

  if (Hls.isSupported()) {
    const hlsInstance = new Hls({ ...HLS_CONFIG, startPosition: startPositionMs / 1000 });
    slot.hls = hlsInstance;
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(el);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      void logger.debug(`[audio-engine] HLS manifest parsed (isOutgoing=${slot.isOutgoing})`);
      if (!slot.isOutgoing) {
        startSlotProgress(slot);
      }
    });
    hlsInstance.on(Hls.Events.BUFFER_EOS, () => {
      if (!slot.isOutgoing) {
        callbacks.onFullyBuffered();
      }
    });
    hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hlsInstance.recoverMediaError();
        return;
      }
      if (slot !== activeSlot) return;

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !urlRefreshAttempted) {
        urlRefreshAttempted = true;
        const positionMs = (slot.audio?.currentTime ?? 0) * 1000;
        stopSlotProgress(slot);
        void logger.debug(`[audio-engine] Fatal HLS network error (${data.details}); requesting URL refresh at ${positionMs}ms`);
        callbacks.onUrlExpired(positionMs);
        return;
      }

      stopSlotProgress(slot);
      setState('idle');
      callbacks.onError(`HLS error: ${data.type} - ${data.details}`);
    });
    return;
  }

  el.src = url;
  el.load();
  if (startPositionMs > 0) {
    el.addEventListener(
      'loadedmetadata',
      () => {
        el.currentTime = startPositionMs / 1000;
      },
      { once: true },
    );
  }
}

function destroySlotHls(slot: Slot) {
  if (slot.hls) {
    slot.hls.destroy();
    slot.hls = null;
  }
}

function resetSlotAudio(slot: Slot) {
  if (slot.audio) {
    slot.audio.pause();
    slot.audio.removeAttribute('src');
    slot.audio.load();
  }
}

function destroySlot(slot: Slot) {
  stopSlotProgress(slot);
  destroySlotHls(slot);
  resetSlotAudio(slot);
  if (slot.audio) {
    slot.audio.remove();
    slot.audio = null;
  }
  slot.isOutgoing = false;
}

function startSlotProgress(slot: Slot) {
  stopSlotProgress(slot);
  slot.progressInterval = setInterval(() => {
    if (!slot.audio) return;
    callbacks.onProgress(slot.audio.currentTime * 1000, (slot.audio.duration || 0) * 1000);
  }, 250);
}

function stopSlotProgress(slot: Slot) {
  if (slot.progressInterval !== null) {
    clearInterval(slot.progressInterval);
    slot.progressInterval = null;
  }
}

function cancelRamp() {
  if (rampId !== null) {
    window.clearInterval(rampId);
    rampId = null;
  }
}

function clearStandby() {
  if (standbySlot) {
    destroySlot(standbySlot);
    standbySlot = null;
  }
}

function startRamp(outgoing: Slot, incoming: Slot, durationMs: number) {
  const startTime = performance.now();
  const RAMP_INTERVAL_MS = 50;

  function tick() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const vol = rampTargetVolume;

    const fadeIn = Math.sin((progress * Math.PI) / 2);
    if (incoming.audio) incoming.audio.volume = vol * fadeIn;

    if (progress >= 1) {
      window.clearInterval(rampId!);
      crossfading = false;
      crossfadePendingBegin = null;
      rampId = null;
      destroySlot(outgoing);
      standbySlot = null;
      callbacks.onCrossfadeComplete();
    }
  }

  rampId = window.setInterval(tick, RAMP_INTERVAL_MS);
  tick();
}

export const audioEngine = {
  setCallbacks(cb: Partial<AudioEngineCallbacks>) {
    callbacks = { ...DEFAULT_CALLBACKS, ...cb };
  },

  load(url: string, startPositionMs = 0) {
    playWhenReady = false;
    urlRefreshAttempted = false;
    clearStandby();
    stopSlotProgress(activeSlot);
    destroySlotHls(activeSlot);
    setState('loading');
    void logger.debug(`[audio-engine] Loading into active slot (startPosition=${startPositionMs}ms): ${url.slice(0, 80)}...`);
    loadSlot(activeSlot, url, startPositionMs);
  },

  play() {
    const el = getSlotAudio(activeSlot);
    if (el.readyState >= 2) {
      playWhenReady = false;
      void logger.debug(`[audio-engine] Playing immediately (readyState=${el.readyState})`);
      safePlay(el);
    } else {
      playWhenReady = true;
      void logger.debug(`[audio-engine] Media not ready (readyState=${el.readyState}), deferring play until canplay`);
    }
  },

  pause() {
    playWhenReady = false;
    getSlotAudio(activeSlot).pause();
  },

  seek(positionMs: number) {
    const el = getSlotAudio(activeSlot);
    if (currentState === 'playing') {
      setState('loading');
    }
    el.currentTime = positionMs / 1000;
  },

  setVolume(volume: number) {
    const clamped = clamp(volume, 0, 1);
    if (crossfading) {
      // During crossfade, only update the ramp target — the ramp overwrites slot volumes each tick
      rampTargetVolume = clamped;
      return;
    }
    getSlotAudio(activeSlot).volume = clamped;
  },

  stop() {
    playWhenReady = false;
    audioEngine.cancelCrossfade();

    stopSlotProgress(activeSlot);
    destroySlotHls(activeSlot);
    resetSlotAudio(activeSlot);

    setState('idle');
  },

  getState(): AudioEngineState {
    return currentState;
  },

  getPosition(): { positionMs: number; durationMs: number } {
    if (!activeSlot.audio) return { positionMs: 0, durationMs: 0 };
    return {
      positionMs: activeSlot.audio.currentTime * 1000,
      durationMs: (activeSlot.audio.duration || 0) * 1000,
    };
  },

  isFullyBuffered(): boolean {
    const el = activeSlot.audio;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return false;
    const { buffered, currentTime, duration } = el;
    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i) && buffered.end(i) >= duration - BUFFERED_END_TOLERANCE_S) {
        return true;
      }
    }
    return false;
  },

  destroy() {
    playWhenReady = false;
    urlRefreshAttempted = false;
    cancelRamp();
    crossfading = false;
    crossfadePendingBegin = null;

    destroySlot(activeSlot);
    activeSlot = createSlot();
    clearStandby();

    setState('idle');
  },

  preloadNext(url: string) {
    clearStandby();
    standbySlot = createSlot();
    loadSlot(standbySlot, url);
  },

  startCrossfade(durationMs: number, targetVolume: number) {
    if (!standbySlot) return;

    const incoming = standbySlot;
    const outgoing = activeSlot;
    let cancelled = false;

    function begin() {
      if (cancelled) return;
      crossfadePendingBegin = null;

      outgoing.isOutgoing = true;
      stopSlotProgress(outgoing);

      activeSlot = incoming;
      standbySlot = outgoing;

      if (incoming.audio) {
        incoming.audio.volume = 0;
        safePlay(incoming.audio, 'Crossfade play');
      }
      startSlotProgress(incoming);

      crossfading = true;
      rampTargetVolume = targetVolume;
      startRamp(outgoing, incoming, durationMs);
    }

    const incomingAudio = getSlotAudio(incoming);
    if (incomingAudio.readyState >= 3) {
      begin();
    } else {
      incomingAudio.addEventListener('canplay', () => begin(), { once: true });
      crossfadePendingBegin = () => {
        cancelled = true;
      };
    }
  },

  cancelCrossfade() {
    if (crossfadePendingBegin) {
      crossfadePendingBegin();
      crossfadePendingBegin = null;
      clearStandby();
      if (!crossfading) return;
    }

    if (!crossfading) return;

    cancelRamp();

    const incomingSlot = activeSlot;
    const outgoingSlot = standbySlot;

    if (!outgoingSlot?.isOutgoing) {
      crossfading = false;
      return;
    }

    destroySlot(incomingSlot);

    outgoingSlot.isOutgoing = false;
    activeSlot = outgoingSlot;
    standbySlot = null;
    crossfading = false;
    startSlotProgress(outgoingSlot);
  },

  settleCrossfade() {
    if (crossfadePendingBegin) {
      crossfadePendingBegin();
      crossfadePendingBegin = null;
    }

    if (!crossfading) {
      clearStandby();
      return;
    }

    cancelRamp();
    clearStandby();

    if (activeSlot.audio) {
      activeSlot.audio.volume = rampTargetVolume;
    }

    crossfading = false;
  },

  isCrossfading(): boolean {
    return crossfading;
  },
};
