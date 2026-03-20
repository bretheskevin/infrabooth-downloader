import type { StateCreator } from 'zustand';
import { purgeStaleCache } from '../url-cache';
import type { PlaybackItem } from '../types';
import type { QueueSliceState, PlayerState } from './types';
import {
  shuffleQueueWithCurrent,
  trackIdSet,
  loadAndPlay,
  incrementLoadGeneration,
  type PlaybackSliceActions,
} from './playbackSlice';

export interface QueueSliceActions {
  syncQueue: (newQueue: PlaybackItem[]) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  removeFromQueue: (index: number) => void;
}

export type QueueSlice = QueueSliceState & QueueSliceActions;

export const createQueueSlice: StateCreator<
  PlayerState & QueueSliceActions & PlaybackSliceActions,
  [],
  [],
  QueueSlice
> = (set, get) => ({
  queue: [],
  originalQueue: null,
  isShuffled: false,

  syncQueue: (newQueue) => {
    const { currentTrack, isShuffled, originalQueue, state } = get();
    if (!currentTrack || state === 'stopped') return;

    const newCursor = newQueue.findIndex((t) => t.trackId === currentTrack.trackId);
    if (newCursor === -1) return;

    set({
      queue: isShuffled ? shuffleQueueWithCurrent(newQueue, newCursor) : newQueue,
      cursor: isShuffled ? 0 : newCursor,
      originalQueue: isShuffled && originalQueue ? newQueue : originalQueue,
    });

    purgeStaleCache(trackIdSet(newQueue));
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
    const { queue, cursor, originalQueue, isShuffled } = get();
    const newQueue = queue.filter((_, i) => i !== index);

    let newOriginalQueue = originalQueue;
    if (isShuffled && originalQueue) {
      const removedTrack = queue[index];
      if (removedTrack) {
        newOriginalQueue = originalQueue.filter((t) => t.trackId !== removedTrack.trackId);
      }
    }

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
    set({ queue: newQueue, cursor: newCursor, currentTrack: newTrack, originalQueue: newOriginalQueue });
    purgeStaleCache(trackIdSet(newQueue));

    if (removingCurrent && newTrack) {
      const generation = incrementLoadGeneration();
      set({ state: 'loading', positionMs: 0, durationMs: newTrack.durationMs });
      void loadAndPlay(newTrack, generation, get);
    }
  },
});
