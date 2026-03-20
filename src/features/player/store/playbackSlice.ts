import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/features/settings/store';
import { audioEngine } from '../audio-engine';
import { resolveWithCache, preloadQueueSegments, purgeStaleCache } from '../url-cache';
import type { PlaybackItem, PlaybackState } from '../types';
import type { PlaybackSliceState, PlayerState } from './types';

const MAX_CONSECUTIVE_FAILURES = 3;

let loadGeneration = 0;
let consecutiveFailures = 0;

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
    const url = await resolveWithCache(track.trackId, track.trackUrl);
    if (generation !== loadGeneration) return;
    consecutiveFailures = 0;
    audioEngine.setVolume(get().volume);
    audioEngine.load(url);
    audioEngine.play();
  } catch (e) {
    if (generation !== loadGeneration) return;
    const msg = e instanceof Error ? e.message : String(e);
    void logger.error(`[player] Failed to resolve track ${track.trackId}: ${msg}`);
    toast.error(i18n.t('player.errorLoadTrack'));

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

  play: async (queue, index) => {
    const track = queue[index];
    if (!track) return;

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
    preloadQueueSegments(finalQueue, finalIndex + 1, 2);
  },

  pause: () => {
    audioEngine.pause();
  },

  resume: () => {
    audioEngine.resume();
  },

  seek: (positionMs) => {
    audioEngine.seek(positionMs);
    set({ positionMs });
  },

  next: async () => {
    const { queue, cursor } = get();
    const nextCursor = cursor + 1;
    const track = queue[nextCursor];
    if (!track) {
      get().stop();
      return;
    }
    const generation = ++loadGeneration;
    set({
      cursor: nextCursor,
      currentTrack: track,
      state: 'loading',
      positionMs: 0,
      durationMs: track.durationMs,
    });
    await loadAndPlay(track, generation, get);
    preloadQueueSegments(queue, nextCursor + 1, 2);
  },

  previous: async () => {
    const { queue, cursor } = get();
    const prevCursor = cursor - 1;
    const track = queue[prevCursor];
    if (!track) return;
    const generation = ++loadGeneration;
    set({
      cursor: prevCursor,
      currentTrack: track,
      state: 'loading',
      positionMs: 0,
      durationMs: track.durationMs,
    });
    await loadAndPlay(track, generation, get);
  },

  stop: () => {
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
    const { queue } = get();
    const track = queue[index];
    if (!track) return;

    consecutiveFailures = 0;
    const generation = ++loadGeneration;
    set({
      cursor: index,
      currentTrack: track,
      state: 'loading',
      positionMs: 0,
      durationMs: track.durationMs,
    });
    await loadAndPlay(track, generation, get);
    preloadQueueSegments(queue, index + 1, 2);
  },

  _initAudioEngine: () => {
    audioEngine.setCallbacks({
      onStateChange: (engineState) => {
        const current = get().state;
        const stateMap: Record<string, PlaybackState> = {
          idle: 'stopped',
          loading: 'loading',
          playing: 'playing',
          paused: 'paused',
        };
        const mapped = stateMap[engineState] ?? 'stopped';
        if (current === 'loading' && mapped === 'stopped') return;
        set({ state: mapped });
      },
      onProgress: (positionMs, durationMs) => {
        set({ positionMs, durationMs });
      },
      onEnded: () => {
        get().next();
      },
      onError: (message) => {
        void logger.error(`[player] Audio engine error: ${message}`);
      },
      onFullyBuffered: () => {
        const { queue, cursor, state } = get();
        if (state === 'stopped') return;
        const next = queue[cursor + 1];
        if (next) {
          void resolveWithCache(next.trackId, next.trackUrl).catch(() => {});
        }
      },
    });
  },

  _destroyAudioEngine: () => {
    audioEngine.destroy();
  },
});

export { shuffleArray, shuffleQueueWithCurrent, trackIdSet, loadAndPlay, loadGeneration };
export const resetConsecutiveFailures = () => { consecutiveFailures = 0; };
export const getLoadGeneration = () => loadGeneration;
export const incrementLoadGeneration = () => ++loadGeneration;
