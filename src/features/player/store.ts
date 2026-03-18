import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/features/settings/store';
import { audioEngine } from './audio-engine';
import { resolveWithCache, preloadQueueSegments, purgeStaleCache } from './url-cache';
import type { PlaybackItem, PlaybackState } from './types';

/** Max consecutive load failures before stopping instead of auto-skipping. */
const MAX_CONSECUTIVE_FAILURES = 3;

const trackIdSet = (queue: PlaybackItem[]) => new Set(queue.map((t) => t.trackId));

interface PlayerStore {
  state: PlaybackState;
  currentTrack: PlaybackItem | null;
  queue: PlaybackItem[];
  cursor: number;
  positionMs: number;
  durationMs: number;
  volume: number;
  isExpanded: boolean;
  isQueueOpen: boolean;

  play: (queue: PlaybackItem[], index: number) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  removeFromQueue: (index: number) => void;
  toggleExpanded: () => void;
  toggleQueue: () => void;
  collapse: () => void;

  /** Called by usePlayerEvents to wire audio engine callbacks */
  _initAudioEngine: () => void;
  _destroyAudioEngine: () => void;
}

/**
 * Monotonically increasing generation counter.
 * Incremented each time a new track starts loading. Async loaders compare
 * their captured generation with the current one to detect cancellation.
 */
let loadGeneration = 0;

/** Tracks consecutive load failures to avoid infinite error-skip cascades. */
let consecutiveFailures = 0;

/** Load and play a track by resolving its URL and feeding it to the audio engine. */
async function loadAndPlay(
  track: PlaybackItem,
  generation: number,
  get: () => PlayerStore,
) {
  try {
    const url = await resolveWithCache(track.trackId, track.trackUrl);
    // Check if this load is still current (user may have pressed stop/next)
    if (generation !== loadGeneration) return;
    consecutiveFailures = 0;
    audioEngine.setVolume(get().volume);
    audioEngine.load(url);
    audioEngine.play();
  } catch (e) {
    // Check if this load is still current
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

    // Try next track automatically
    const { cursor, queue } = get();
    if (cursor + 1 < queue.length) {
      get().next();
    } else {
      get().stop();
    }
  }
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  state: 'stopped',
  currentTrack: null,
  queue: [],
  cursor: 0,
  positionMs: 0,
  durationMs: 0,
  volume: 1.0,
  isExpanded: false,
  isQueueOpen: false,

  play: async (queue, index) => {
    const track = queue[index];
    if (!track) return;

    const generation = ++loadGeneration;
    consecutiveFailures = 0;
    const vol = useSettingsStore.getState().playerVolume;
    set({
      queue,
      cursor: index,
      currentTrack: track,
      state: 'loading',
      volume: vol,
      positionMs: 0,
      durationMs: track.durationMs,
    });

    await loadAndPlay(track, generation, get);
    purgeStaleCache(trackIdSet(queue));
    preloadQueueSegments(queue, index + 1, 2);
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
    ++loadGeneration; // Cancel any in-flight loader
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
    });
  },

  setVolume: (volume) => {
    audioEngine.setVolume(volume);
    set({ volume });
    useSettingsStore.getState().setPlayerVolume(volume);
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue, cursor } = get();
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved!);

    let newCursor = cursor;
    if (fromIndex === cursor) {
      newCursor = toIndex;
    } else if (fromIndex < cursor && toIndex >= cursor) {
      newCursor = cursor - 1;
    } else if (fromIndex > cursor && toIndex <= cursor) {
      newCursor = cursor + 1;
    }

    set({ queue: newQueue, cursor: newCursor, currentTrack: newQueue[newCursor] ?? null });
  },

  removeFromQueue: (index) => {
    const { queue, cursor } = get();
    const newQueue = queue.filter((_, i) => i !== index);

    if (newQueue.length === 0) {
      get().stop();
      return;
    }

    let newCursor = cursor;
    const removingCurrent = index === cursor;
    if (index < cursor) {
      newCursor = cursor - 1;
    } else if (removingCurrent) {
      newCursor = Math.min(cursor, newQueue.length - 1);
    }

    const newTrack = newQueue[newCursor] ?? null;
    set({ queue: newQueue, cursor: newCursor, currentTrack: newTrack });
    purgeStaleCache(trackIdSet(newQueue));

    // If we removed the currently playing track, load the new current track.
    // Fire-and-forget: errors are handled inside loadAndPlay (toast + auto-skip).
    if (removingCurrent && newTrack) {
      const generation = ++loadGeneration;
      set({ state: 'loading', positionMs: 0, durationMs: newTrack.durationMs });
      void loadAndPlay(newTrack, generation, get);
    }
  },

  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  collapse: () => set({ isExpanded: false }),

  _initAudioEngine: () => {
    audioEngine.setCallbacks({
      onStateChange: (engineState) => {
        // Only accept engine state changes if they don't conflict with
        // an in-progress store-driven transition (e.g. optimistic 'loading')
        const current = get().state;
        const stateMap: Record<string, PlaybackState> = {
          idle: 'stopped',
          loading: 'loading',
          playing: 'playing',
          paused: 'paused',
        };
        const mapped = stateMap[engineState] ?? 'stopped';
        // Don't let a stale 'idle' clobber an optimistic 'loading' state
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
}));


export const usePlayerState = () =>
  usePlayerStore(
    useShallow((s) => ({
      state: s.state,
      currentTrack: s.currentTrack,
      positionMs: s.positionMs,
      durationMs: s.durationMs,
      volume: s.volume,
    }))
  );

export const usePlayerUI = () =>
  usePlayerStore(
    useShallow((s) => ({
      isExpanded: s.isExpanded,
      isQueueOpen: s.isQueueOpen,
    }))
  );
