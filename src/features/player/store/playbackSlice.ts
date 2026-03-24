import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/features/settings/store';
import { audioEngine } from '../audio-engine';
import { resolveWithCache, getCachedUrl, preloadQueueSegments, purgeStaleCache } from '../url-cache';
import type { PlaybackItem, PlaybackState } from '../types';
import type { PlaybackSliceState, PlayerState } from './types';

const MAX_CONSECUTIVE_FAILURES = 3;

let loadGeneration = 0;
let crossfadeGeneration = 0;
let consecutiveFailures = 0;
let lastPreloadRefresh = 0;

const trackIdSet = (queue: PlaybackItem[]) => new Set(queue.map((t) => t.trackId));

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

function shuffleQueueWithCurrent(queue: PlaybackItem[], currentIndex: number): PlaybackItem[] {
  const current = queue[currentIndex]!;
  const rest = queue.filter((_, i) => i !== currentIndex);
  return [current, ...shuffleArray(rest)];
}

async function loadAndPlay(
  track: PlaybackItem,
  generation: number,
  get: () => PlayerState & PlaybackSliceActions,
) {
  try {
    void logger.debug(`[player] Resolving URL for track ${track.trackId} (gen=${generation})`);
    const url = await resolveWithCache(track.trackId, track.trackUrl);
    if (generation !== loadGeneration) {
      void logger.debug(`[player] Stale generation ${generation} (current=${loadGeneration}), skipping load`);
      return;
    }
    consecutiveFailures = 0;
    void logger.debug(`[player] Loading track ${track.trackId} into audio engine`);
    audioEngine.setVolume(get().volume);
    audioEngine.load(url);
    audioEngine.play();
  } catch (e) {
    if (generation !== loadGeneration) return;
    const msg = e instanceof Error ? e.message : String(e);
    void logger.error(`[player] Failed to resolve track ${track.trackId}: ${msg}`);
    toast.error(`${i18n.t('player.errorLoadTrack')}: ${msg}`);

    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      void logger.error(`[player] ${MAX_CONSECUTIVE_FAILURES} consecutive failures, stopping`);
      consecutiveFailures = 0;
      get().stop();
      return;
    }

    const { cursor, queue } = get();
    if (cursor + 1 < queue.length) {
      get().next();
    } else {
      get().stop();
    }
  }
}

export interface PlaybackSliceActions {
  play: (queue: PlaybackItem[], index: number) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  stop: () => void;
  skipTo: (index: number) => Promise<void>;
  _initAudioEngine: () => void;
  _destroyAudioEngine: () => void;
}

type SetFn = (state: Partial<PlaybackSliceState>) => void;
type GetFn = () => PlayerState & PlaybackSliceActions;

const ENGINE_STATE_MAP: Record<string, PlaybackState> = {
  idle: 'stopped',
  loading: 'loading',
  playing: 'playing',
  paused: 'paused',
};

const CROSSFADE_RESET = { crossfadePending: false, crossfadingTrackId: null } as const;

async function startTrackLoad(set: SetFn, get: GetFn, track: PlaybackItem, cursor: number) {
  const generation = ++loadGeneration;
  set({
    cursor,
    currentTrack: track,
    state: 'loading',
    positionMs: 0,
    durationMs: track.durationMs,
  });
  await loadAndPlay(track, generation, get);
}

function advanceToCrossfadingTrack(set: SetFn, get: GetFn) {
  const { crossfadingTrackId, currentTrack, queue } = get();
  if (!crossfadingTrackId || currentTrack?.trackId === crossfadingTrackId) return;

  const idx = queue.findIndex((t) => t.trackId === crossfadingTrackId);
  if (idx !== -1) {
    set({ cursor: idx, currentTrack: queue[idx] });
  }
}

function cancelAnyCrossfade(set: SetFn) {
  if (audioEngine.isCrossfading()) {
    audioEngine.cancelCrossfade();
  }
  set(CROSSFADE_RESET);
}

function settleAnyCrossfade(set: SetFn, get: GetFn) {
  audioEngine.settleCrossfade();
  advanceToCrossfadingTrack(set, get);
  set(CROSSFADE_RESET);
}

async function triggerCrossfade(
  set: SetFn,
  get: GetFn,
  nextTrack: PlaybackItem,
  thresholdMs: number,
  generation: number,
) {
  try {
    const url = await resolveWithCache(nextTrack.trackId, nextTrack.trackUrl);
    if (generation !== crossfadeGeneration) return;
    if (!get().crossfadePending) return;

    audioEngine.preloadNext(url);
    audioEngine.startCrossfade(thresholdMs, useSettingsStore.getState().playerVolume);
  } catch {
    set(CROSSFADE_RESET);
  }
}

function maybeTriggerCrossfade(set: SetFn, get: GetFn, positionMs: number, durationMs: number) {
  const { crossfadeEnabled, crossfadeDuration } = useSettingsStore.getState();
  if (!crossfadeEnabled) return;

  const { state, cursor, queue } = get();
  if (state !== 'playing') return;

  const remainingMs = durationMs - positionMs;
  const thresholdMs = crossfadeDuration * 1000;
  if (durationMs <= thresholdMs) return;

  const nextTrack = queue[cursor + 1];
  if (!nextTrack) return;

  if (remainingMs > thresholdMs && remainingMs <= thresholdMs * 2) {
    if (!getCachedUrl(nextTrack.trackId)) {
      void resolveWithCache(nextTrack.trackId, nextTrack.trackUrl).catch(() => {});
    }
    return;
  }

  if (remainingMs > thresholdMs) return;

  set({ crossfadePending: true, crossfadingTrackId: nextTrack.trackId });
  void triggerCrossfade(set, get, nextTrack, thresholdMs, ++crossfadeGeneration);
}

function resolveCrossfadeForSkip(set: SetFn, get: GetFn) {
  if (!audioEngine.isCrossfading() && !get().crossfadePending) return;
  const { currentTrack, crossfadingTrackId } = get();
  if (currentTrack?.trackId === crossfadingTrackId) {
    settleAnyCrossfade(set, get);
  } else {
    cancelAnyCrossfade(set);
  }
}

export type PlaybackSlice = PlaybackSliceState & PlaybackSliceActions;

export const createPlaybackSlice: StateCreator<
  PlayerState & PlaybackSliceActions,
  [],
  [],
  PlaybackSlice
> = (set, get) => ({
  state: 'stopped',
  currentTrack: null,
  cursor: 0,
  positionMs: 0,
  durationMs: 0,
  crossfadePending: false,
  crossfadingTrackId: null,

  play: async (queue, index) => {
    const track = queue[index];
    if (!track) return;

    cancelAnyCrossfade(set);
    const generation = ++loadGeneration;
    consecutiveFailures = 0;
    const vol = useSettingsStore.getState().playerVolume;

    const { isShuffled } = get();
    let finalQueue = queue;
    let finalIndex = index;

    if (isShuffled && queue.length > 1) {
      finalQueue = shuffleQueueWithCurrent(queue, index);
      finalIndex = 0;
      set({ originalQueue: queue });
    } else {
      set({ originalQueue: null });
    }

    const finalTrack = finalQueue[finalIndex]!;
    set({
      queue: finalQueue,
      cursor: finalIndex,
      currentTrack: finalTrack,
      state: 'loading',
      volume: vol,
      positionMs: 0,
      durationMs: finalTrack.durationMs,
    });

    await loadAndPlay(finalTrack, generation, get);
    purgeStaleCache(trackIdSet(finalQueue));
    preloadQueueSegments(finalQueue, finalIndex + 1);
    preloadQueueSegments(finalQueue, finalIndex - 1);
  },

  pause: () => {
    if (audioEngine.isCrossfading() || get().crossfadePending) {
      settleAnyCrossfade(set, get);
    }
    audioEngine.pause();
  },

  resume: () => {
    audioEngine.play();
  },

  seek: (positionMs) => {
    if (audioEngine.isCrossfading() || get().crossfadePending) {
      settleAnyCrossfade(set, get);
      ++crossfadeGeneration;
    }
    audioEngine.seek(positionMs);
    set({ positionMs });
  },

  next: async () => {
    resolveCrossfadeForSkip(set, get);
    const { queue, cursor } = get();
    const nextCursor = cursor + 1;
    const track = queue[nextCursor];
    if (!track) {
      get().stop();
      return;
    }
    await startTrackLoad(set, get, track, nextCursor);
    preloadQueueSegments(queue, nextCursor + 1);
    preloadQueueSegments(queue, nextCursor - 1);
  },

  previous: async () => {
    resolveCrossfadeForSkip(set, get);
    const { queue, cursor } = get();
    const prevCursor = cursor - 1;
    const track = queue[prevCursor];
    if (!track) return;
    await startTrackLoad(set, get, track, prevCursor);
    preloadQueueSegments(queue, prevCursor - 1);
    preloadQueueSegments(queue, prevCursor + 1);
  },

  stop: () => {
    cancelAnyCrossfade(set);
    ++loadGeneration;
    audioEngine.stop();
    purgeStaleCache(new Set());
    set({
      state: 'stopped',
      currentTrack: null,
      queue: [],
      cursor: 0,
      positionMs: 0,
      durationMs: 0,
      isQueueOpen: false,
      isShuffled: false,
      originalQueue: null,
    });
  },

  skipTo: async (index) => {
    cancelAnyCrossfade(set);
    const { queue } = get();
    const track = queue[index];
    if (!track) return;

    consecutiveFailures = 0;
    await startTrackLoad(set, get, track, index);
    preloadQueueSegments(queue, index + 1);
    preloadQueueSegments(queue, index - 1);
  },

  _initAudioEngine: () => {
    audioEngine.setCallbacks({
      onStateChange: (engineState) => {
        const current = get().state;
        const mapped = ENGINE_STATE_MAP[engineState] ?? 'stopped';
        if (current === 'loading' && mapped === 'stopped') return;
        set({ state: mapped });
      },
      onProgress: (positionMs, durationMs) => {
        set({ positionMs, durationMs });

        if (get().crossfadePending) {
          if (audioEngine.isCrossfading()) advanceToCrossfadingTrack(set, get);
          return;
        }

        const now = Date.now();
        if (now - lastPreloadRefresh > 60_000) {
          lastPreloadRefresh = now;
          const { queue, cursor } = get();
          preloadQueueSegments(queue, cursor + 1);
          preloadQueueSegments(queue, cursor - 1);
        }

        maybeTriggerCrossfade(set, get, positionMs, durationMs);
      },
      onEnded: () => {
        if (audioEngine.isCrossfading()) return;
        get().next();
      },
      onError: (message) => {
        void logger.error(`[player] Audio engine error: ${message}`);
        toast.error(`${i18n.t('player.errorLoadTrack')}: ${message}`);

        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          void logger.error(`[player] ${MAX_CONSECUTIVE_FAILURES} consecutive failures, stopping`);
          consecutiveFailures = 0;
          get().stop();
          return;
        }

        const { cursor, queue } = get();
        void logger.debug(`[player] Error recovery: cursor=${cursor}, queueLength=${queue.length}`);
        if (cursor + 1 < queue.length) {
          get().next();
        } else {
          get().stop();
        }
      },
      onFullyBuffered: () => {
        const { queue, cursor, state } = get();
        if (state === 'stopped') return;
        const next = queue[cursor + 1];
        if (next) {
          void resolveWithCache(next.trackId, next.trackUrl).catch(() => {});
        }
      },
      onCrossfadeComplete: () => {
        advanceToCrossfadingTrack(set, get);
        set(CROSSFADE_RESET);
        preloadQueueSegments(get().queue, get().cursor + 1);
        preloadQueueSegments(get().queue, get().cursor - 1);
      },
    });
  },

  _destroyAudioEngine: () => {
    audioEngine.destroy();
  },
});

export { shuffleQueueWithCurrent, trackIdSet, loadAndPlay };
export const incrementLoadGeneration = () => ++loadGeneration;
export const resetCrossfadeGeneration = () => { crossfadeGeneration = 0; };
