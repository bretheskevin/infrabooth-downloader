import { listen } from '@tauri-apps/api/event';
import {
  commands,
  type ErrorResponse,
  type PlayerCrossfadeCompleteEvent,
  type PlayerEndedEvent,
  type PlayerEngineState,
  type PlayerErrorEvent,
  type PlayerFullyBufferedEvent,
  type PlayerProgressEvent,
  type PlayerSpectrumEvent,
  type PlayerStateChangedEvent,
  type PlayerUrlExpiredEvent,
  type Result,
} from '@/bindings';
import { clamp } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { sendPlayerCommand } from './player-commands';

export type AudioEngineState = PlayerEngineState;

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

export const PLAYER_EVENTS = {
  stateChanged: 'player-state-changed',
  progress: 'player-progress',
  ended: 'player-ended',
  error: 'player-error',
  fullyBuffered: 'player-fully-buffered',
  crossfadeComplete: 'player-crossfade-complete',
  urlExpired: 'player-url-expired',
  spectrum: 'player-spectrum',
} as const;

interface Snapshot {
  state: AudioEngineState;
  positionMs: number;
  durationMs: number;
  progressAt: number;
  fullyBuffered: boolean;
  crossfading: boolean;
  hasStandby: boolean;
}

function initialSnapshot(): Snapshot {
  return { state: 'idle', positionMs: 0, durationMs: 0, progressAt: 0, fullyBuffered: false, crossfading: false, hasStandby: false };
}

let callbacks: AudioEngineCallbacks = { ...DEFAULT_CALLBACKS };
let generation = 0;
let snapshot: Snapshot = initialSnapshot();
let listenersReady: Promise<void> | null = null;
let spectrumListener: ((bands: number[]) => void) | null = null;

function interpolatedPositionMs(): number {
  if (snapshot.state !== 'playing') return snapshot.positionMs;
  const interpolated = snapshot.positionMs + (performance.now() - snapshot.progressAt);
  return snapshot.durationMs > 0 ? Math.min(interpolated, snapshot.durationMs) : interpolated;
}

function applyState(state: AudioEngineState) {
  if (state === snapshot.state) return;
  snapshot.positionMs = interpolatedPositionMs();
  snapshot.progressAt = performance.now();
  snapshot.state = state;
  if (state === 'idle') snapshot.crossfading = false;
  callbacks.onStateChange(state);
}

function applyProgress(payload: PlayerProgressEvent) {
  snapshot.positionMs = payload.positionMs;
  snapshot.durationMs = payload.durationMs;
  snapshot.progressAt = performance.now();
  callbacks.onProgress(payload.positionMs, payload.durationMs);
}

function subscribe<T extends { loadGeneration: number }>(name: string, handler: (payload: T) => void) {
  return listen<T>(name, (event) => {
    if (event.payload.loadGeneration !== generation) return;
    handler(event.payload);
  });
}

async function registerListeners(): Promise<void> {
  const results = await Promise.allSettled([
    subscribe<PlayerStateChangedEvent>(PLAYER_EVENTS.stateChanged, (p) => applyState(p.state)),
    subscribe<PlayerProgressEvent>(PLAYER_EVENTS.progress, applyProgress),
    subscribe<PlayerEndedEvent>(PLAYER_EVENTS.ended, () => {
      snapshot.crossfading = false;
      callbacks.onEnded();
    }),
    subscribe<PlayerErrorEvent>(PLAYER_EVENTS.error, (p) => {
      snapshot.crossfading = false;
      callbacks.onError(p.message);
    }),
    subscribe<PlayerFullyBufferedEvent>(PLAYER_EVENTS.fullyBuffered, () => {
      snapshot.fullyBuffered = true;
      callbacks.onFullyBuffered();
    }),
    subscribe<PlayerCrossfadeCompleteEvent>(PLAYER_EVENTS.crossfadeComplete, () => {
      snapshot.crossfading = false;
      snapshot.hasStandby = false;
      callbacks.onCrossfadeComplete();
    }),
    subscribe<PlayerUrlExpiredEvent>(PLAYER_EVENTS.urlExpired, (p) => callbacks.onUrlExpired(p.positionMs)),
    subscribe<PlayerSpectrumEvent>(PLAYER_EVENTS.spectrum, (p) => spectrumListener?.(p.bands)),
  ]);
  const failure = results.find((r) => r.status === 'rejected');
  if (!failure) return;
  results.forEach((r) => {
    if (r.status === 'fulfilled') r.value();
  });
  throw failure.reason;
}

function ensureListeners(): Promise<void> {
  listenersReady ??= registerListeners().catch((e: unknown) => {
    listenersReady = null;
    void logger.error(`[audio-engine] Failed to register player event listeners: ${String(e)}`);
  });
  return listenersReady;
}

function send(name: string, call: () => Promise<Result<null, ErrorResponse>>) {
  sendPlayerCommand(name, async () => {
    await ensureListeners();
    return call();
  });
}

function resetForNewGeneration(positionMs: number) {
  generation++;
  snapshot = { ...initialSnapshot(), state: snapshot.state, positionMs, progressAt: performance.now() };
  return generation;
}

export const audioEngine = {
  setCallbacks(cb: Partial<AudioEngineCallbacks>) {
    callbacks = { ...DEFAULT_CALLBACKS, ...cb };
    void ensureListeners();
  },

  setSpectrumListener(listener: ((bands: number[]) => void) | null) {
    spectrumListener = listener;
    void ensureListeners();
  },

  load(url: string, startPositionMs = 0) {
    const gen = resetForNewGeneration(startPositionMs);
    void logger.info(`[audio-engine] Loading (gen=${gen}, startPosition=${startPositionMs}ms): ${url.slice(0, 80)}...`);
    applyState('loading');
    send('playerLoad', () => commands.playerLoad(url, startPositionMs, gen));
  },

  play() {
    send('playerPlay', () => commands.playerPlay());
  },

  pause() {
    send('playerPause', () => commands.playerPause());
  },

  seek(positionMs: number) {
    if (snapshot.state === 'playing') applyState('loading');
    snapshot.positionMs = positionMs;
    snapshot.progressAt = performance.now();
    send('playerSeek', () => commands.playerSeek(positionMs));
  },

  setVolume(volume: number) {
    const clamped = clamp(volume, 0, 1);
    send('playerSetVolume', () => commands.playerSetVolume(clamped));
  },

  stop() {
    const gen = resetForNewGeneration(0);
    applyState('idle');
    send('playerStop', () => commands.playerStop(gen));
  },

  getState(): AudioEngineState {
    return snapshot.state;
  },

  getPosition(): { positionMs: number; durationMs: number } {
    return { positionMs: interpolatedPositionMs(), durationMs: snapshot.durationMs };
  },

  isFullyBuffered(): boolean {
    return snapshot.fullyBuffered;
  },

  destroy() {
    const gen = resetForNewGeneration(0);
    applyState('idle');
    send('playerDestroy', () => commands.playerDestroy(gen));
  },

  preloadNext(url: string) {
    snapshot.hasStandby = true;
    send('playerPreloadNext', () => commands.playerPreloadNext(url));
  },

  startCrossfade(durationMs: number, targetVolume: number) {
    if (!snapshot.hasStandby) return;
    snapshot.crossfading = true;
    send('playerStartCrossfade', () => commands.playerStartCrossfade(durationMs, targetVolume));
  },

  cancelCrossfade() {
    snapshot.crossfading = false;
    snapshot.hasStandby = false;
    send('playerCancelCrossfade', () => commands.playerCancelCrossfade());
  },

  settleCrossfade() {
    snapshot.crossfading = false;
    snapshot.hasStandby = false;
    send('playerSettleCrossfade', () => commands.playerSettleCrossfade());
  },

  isCrossfading(): boolean {
    return snapshot.crossfading;
  },
};
