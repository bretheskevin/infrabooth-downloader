import type { StateCreator } from 'zustand';
import { purgeStaleCache } from '../url-cache';
import type { PlaybackItem } from '../types';
import type { QueueSliceState, PlayerState } from './types';
import {
  shuffleQueueWithCurrent,
  splitStationTracks,
  trackIdSet,
  loadAndPlay,
  incrementLoadGeneration,
  type PlaybackSliceActions,
} from './playbackSlice';

export interface QueueSliceActions {
  addToQueue: (item: PlaybackItem) => void;
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
  manualQueueCount: 0,

  addToQueue: (item) => {
    const { queue, cursor, state, originalQueue, isShuffled, manualQueueCount } = get();
    if (state === 'stopped' || queue.length === 0) {
      get().play([item], 0);
      return;
    }
    const insertAt = cursor + 1 + manualQueueCount;
    const newQueue = [...queue];
    newQueue.splice(insertAt, 0, item);

    if (isShuffled && originalQueue) {
      set({ queue: newQueue, originalQueue: [...originalQueue, item], manualQueueCount: manualQueueCount + 1 });
    } else {
      set({ queue: newQueue, manualQueueCount: manualQueueCount + 1 });
    }
  },

  syncQueue: (newQueue) => {
    const { currentTrack, isShuffled, originalQueue, state, stationQueueCount } = get();
    if (!currentTrack || state === 'stopped') return;

    const newCursor = newQueue.findIndex((t) => t.trackId === currentTrack.trackId);
    if (newCursor === -1) return;

    if (isShuffled) {
      const { userTracks, stationTracks } = splitStationTracks(newQueue, stationQueueCount);
      const userCursor = userTracks.findIndex((t) => t.trackId === currentTrack.trackId);

      set({
        queue: [...shuffleQueueWithCurrent(userTracks, userCursor >= 0 ? userCursor : newCursor), ...stationTracks],
        cursor: 0,
        originalQueue: originalQueue ? newQueue : originalQueue,
        manualQueueCount: 0,
      });
    } else {
      set({
        queue: newQueue,
        cursor: newCursor,
        originalQueue: originalQueue,
        manualQueueCount: 0,
      });
    }

    purgeStaleCache(trackIdSet(newQueue));
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue, cursor, manualQueueCount } = get();
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

    let newManualCount = manualQueueCount;
    if (fromIndex === cursor) {
      newManualCount = 0;
    } else {
      const wasInManual = fromIndex >= cursor + 1 && fromIndex <= cursor + manualQueueCount;
      const nowInManual = toIndex >= newCursor + 1 && toIndex <= newCursor + manualQueueCount;
      if (wasInManual && !nowInManual) {
        newManualCount = manualQueueCount - 1;
      } else if (!wasInManual && nowInManual) {
        newManualCount = manualQueueCount + 1;
      }
    }

    set({ queue: newQueue, cursor: newCursor, currentTrack: newQueue[newCursor] ?? null, manualQueueCount: newManualCount });
  },

  removeFromQueue: (index) => {
    const { queue, cursor, originalQueue, isShuffled, manualQueueCount } = get();
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

    const manualStart = cursor + 1;
    const manualEnd = cursor + manualQueueCount;
    let newManualCount = manualQueueCount;
    if (index >= manualStart && index <= manualEnd) {
      newManualCount = manualQueueCount - 1;
    }

    let newStationCount = get().stationQueueCount;
    const stationStart = queue.length - newStationCount;
    if (newStationCount > 0 && index >= stationStart) {
      newStationCount = newStationCount - 1;
    }

    const newTrack = newQueue[newCursor] ?? null;
    set({ queue: newQueue, cursor: newCursor, currentTrack: newTrack, originalQueue: newOriginalQueue, manualQueueCount: newManualCount, stationQueueCount: newStationCount });
    purgeStaleCache(trackIdSet(newQueue));

    if (removingCurrent && newTrack) {
      const generation = incrementLoadGeneration();
      set({ state: 'loading', positionMs: 0, durationMs: newTrack.durationMs });
      void loadAndPlay(newTrack, generation, get);
    }
  },
});
