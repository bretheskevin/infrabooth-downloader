import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/features/settings/store';
import { audioEngine } from '../audio-engine';
import { fetchStationTracks, fetchStationTracksWithRetry } from '../utils/autoplay';
import { resolveWithCache, getCachedUrl, preloadQueueSegments, purgeStaleCache, invalidateCachedUrl } from '../url-cache';
import type { PlaybackItem, PlaybackState } from '../types';
import type { AutoplaySliceState, PlaybackSliceState, PlayerState } from './types';
import type { AutoplaySliceActions } from './autoplaySlice';

const MAX_CONSECUTIVE_FAILURES = 3;
const MAX_URL_REFRESH_PER_TRACK = 2;

let loadGeneration = 0;
let crossfadeGeneration = 0;
let consecutiveFailures = 0;
let lastPreloadRefresh = 0;
let urlRefreshTrackId: number | null = null;
let urlRefreshCount = 0;

function resetUrlRefreshTracking() {
  urlRefreshTrackId = null;
  urlRefreshCount = 0;
}

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

function splitStationTracks(queue: PlaybackItem[], stationQueueCount: number) {
  const userTracks = stationQueueCount > 0 ? queue.slice(0, -stationQueueCount) : queue;
  const stationTracks = stationQueueCount > 0 ? queue.slice(-stationQueueCount) : [];
  return { userTracks, stationTracks };
}

const STATION_PREFETCH_THRESHOLD = 3;

async function handleAutoplay(set: SetFn, get: GetFn, nextCursor: number) {
  if (get().autoplayInFlight) {
    get().stop();
    return;
  }
  set({ autoplayInFlight: true });
  try {
    const currentTrack = get().currentTrack;
    if (!currentTrack) {
      get().stop();
      return;
    }

    const items = await fetchStationTracksWithRetry(currentTrack.trackId);
    if (!items || items.length === 0) {
      get().stop();
      return;
    }

    get().appendStationTracks(items);
    const nextTrack = get().queue[nextCursor];
    if (!nextTrack) {
      get().stop();
      return;
    }
    await startTrackLoad(set, get, nextTrack, nextCursor);
    preloadQueueSegments(get().queue, nextCursor + 1);
  } finally {
    set({ autoplayInFlight: false });
  }
}

function prefetchStationSilent(get: GetFn, seedTrackId: number) {
  void fetchStationTracks(seedTrackId)
    .then((newItems) => {
      if (newItems.length > 0) {
        get().appendStationTracks(newItems);
      }
    })
    .catch((e) => {
      void logger.debug(`[player] Station prefetch failed (non-fatal): ${e}`);
    });
}

function maybePrefetchStation(get: GetFn) {
  const { queue, cursor, currentTrack, stationQueueCount } = get();
  const remaining = queue.length - cursor - 1;
  if (remaining > STATION_PREFETCH_THRESHOLD) return;

  const seedTrack = stationQueueCount > 0 ? queue[queue.length - 1] : currentTrack;
  if (!seedTrack) return;

  prefetchStationSilent(get, seedTrack.trackId);
}

function prefetchStationOnInit(get: GetFn) {
  const { queue } = get();
  const seedTrack = queue[queue.length - 1];
  if (!seedTrack) return;

  prefetchStationSilent(get, seedTrack.trackId);
}

async function loadAndPlay(track: PlaybackItem, generation: number, get: () => PlayerState & PlaybackSliceActions) {
  try {
    void logger.debug(`[player] Resolving URL for track ${track.trackId} (gen=${generation})`);
    const url = await resolveWithCache(track.trackId, track.trackUrl);
    if (generation !== loadGeneration) {
      void logger.debug(`[player] Stale generation ${generation} (current=${loadGeneration}), skipping load`);
      return;
    }
    consecutiveFailures = 0;
    resetUrlRefreshTracking();
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

    skipOrStop(get);
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

type SetFn = (state: Partial<PlaybackSliceState & AutoplaySliceState>) => void;
type GetFn = () => PlayerState & PlaybackSliceActions & AutoplaySliceActions;

function skipOrStop(get: () => Pick<PlayerState, 'cursor' | 'queue'> & Pick<PlaybackSliceActions, 'next' | 'stop'>) {
  const { cursor, queue } = get();
  if (cursor + 1 < queue.length) {
    get().next();
  } else {
    get().stop();
  }
}

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

async function triggerCrossfade(set: SetFn, get: GetFn, nextTrack: PlaybackItem, thresholdMs: number, generation: number) {
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

export const createPlaybackSlice: StateCreator<PlayerState & PlaybackSliceActions & AutoplaySliceActions, [], [], PlaybackSlice> = (
  set,
  get,
) => ({
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

    const { isShuffled, queue: prevQueue, cursor: prevCursor, manualQueueCount: prevManualCount } = get();
    const manualTracks = prevManualCount > 0 ? prevQueue.slice(prevCursor + 1, prevCursor + 1 + prevManualCount) : [];

    let finalQueue = queue;
    let finalIndex = index;

    if (isShuffled && queue.length > 1) {
      finalQueue = shuffleQueueWithCurrent(queue, index);
      finalIndex = 0;
      const orig = manualTracks.length > 0 ? [...queue, ...manualTracks] : queue;
      set({ originalQueue: orig });
    } else {
      set({ originalQueue: null });
    }

    if (manualTracks.length > 0) {
      finalQueue = [...finalQueue];
      finalQueue.splice(finalIndex + 1, 0, ...manualTracks);
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
      manualQueueCount: manualTracks.length,
      stationQueueCount: 0,
      autoplayInFlight: false,
    });

    await loadAndPlay(finalTrack, generation, get);
    purgeStaleCache(trackIdSet(finalQueue));
    preloadQueueSegments(finalQueue, finalIndex + 1);
    preloadQueueSegments(finalQueue, finalIndex - 1);
    prefetchStationOnInit(get);
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
    const { queue, cursor, manualQueueCount } = get();
    const nextCursor = cursor + 1;
    const track = queue[nextCursor];

    if (!track) {
      await handleAutoplay(set, get, nextCursor);
      return;
    }

    maybePrefetchStation(get);

    if (manualQueueCount > 0) {
      set({ manualQueueCount: manualQueueCount - 1 });
    }
    await startTrackLoad(set, get, track, nextCursor);
    preloadQueueSegments(queue, nextCursor + 1);
    preloadQueueSegments(queue, nextCursor - 1);
  },

  previous: async () => {
    resolveCrossfadeForSkip(set, get);
    const { queue, cursor, manualQueueCount } = get();
    const prevCursor = cursor - 1;
    const track = queue[prevCursor];
    if (!track) return;
    if (manualQueueCount > 0) {
      set({ manualQueueCount: 0 });
    }
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
      manualQueueCount: 0,
      stationQueueCount: 0,
      autoplayInFlight: false,
    });
  },

  skipTo: async (index) => {
    cancelAnyCrossfade(set);
    const { queue, cursor, manualQueueCount } = get();
    const track = queue[index];
    if (!track) return;

    const manualEnd = cursor + manualQueueCount;
    if (index > manualEnd) {
      set({ manualQueueCount: 0 });
    } else if (index > cursor && index <= manualEnd) {
      set({ manualQueueCount: manualEnd - index });
    }

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
      onUrlExpired: async (positionMs) => {
        const { currentTrack } = get();
        if (!currentTrack) return;

        if (urlRefreshTrackId !== currentTrack.trackId) {
          urlRefreshTrackId = currentTrack.trackId;
          urlRefreshCount = 0;
        }
        urlRefreshCount++;

        if (urlRefreshCount > MAX_URL_REFRESH_PER_TRACK) {
          void logger.error(`[player] URL refresh limit reached for track ${currentTrack.trackId}, skipping`);
          toast.error(i18n.t('player.errorLoadTrack'));
          resetUrlRefreshTracking();
          skipOrStop(get);
          return;
        }

        void logger.debug(`[player] Refreshing URL for track ${currentTrack.trackId} at ${positionMs}ms (attempt ${urlRefreshCount})`);
        invalidateCachedUrl(currentTrack.trackId);

        const generation = ++loadGeneration;
        try {
          const url = await resolveWithCache(currentTrack.trackId, currentTrack.trackUrl);
          if (generation !== loadGeneration) return;
          audioEngine.load(url, positionMs);
          audioEngine.play();
        } catch (e) {
          if (generation !== loadGeneration) return;
          const msg = e instanceof Error ? e.message : String(e);
          void logger.error(`[player] URL refresh failed for track ${currentTrack.trackId}: ${msg}`);
          toast.error(`${i18n.t('player.errorLoadTrack')}: ${msg}`);
          resetUrlRefreshTracking();
          skipOrStop(get);
        }
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

        void logger.debug(`[player] Error recovery: cursor=${get().cursor}, queueLength=${get().queue.length}`);
        skipOrStop(get);
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

export { shuffleQueueWithCurrent, splitStationTracks, trackIdSet, loadAndPlay };
export const incrementLoadGeneration = () => ++loadGeneration;
export const resetCrossfadeGeneration = () => {
  crossfadeGeneration = 0;
};
