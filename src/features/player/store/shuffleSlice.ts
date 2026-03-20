import type { StateCreator } from 'zustand';
import type { PlayerState } from './types';
import { shuffleQueueWithCurrent } from './playbackSlice';

export interface ShuffleSliceActions {
  toggleShuffle: () => void;
}

export type ShuffleSlice = ShuffleSliceActions;

export const createShuffleSlice: StateCreator<
  PlayerState & ShuffleSliceActions,
  [],
  [],
  ShuffleSlice
> = (set, get) => ({
  toggleShuffle: () => {
    const { queue, cursor, currentTrack, isShuffled, originalQueue } = get();

    if (queue.length <= 1) return;

    if (!isShuffled) {
      if (!queue[cursor]) return;

      set({
        originalQueue: queue,
        queue: shuffleQueueWithCurrent(queue, cursor),
        cursor: 0,
        isShuffled: true,
      });
    } else {
      if (!originalQueue || !currentTrack) return;

      const newCursor = originalQueue.findIndex((t) => t.trackId === currentTrack.trackId);

      set({
        queue: originalQueue,
        cursor: newCursor >= 0 ? newCursor : 0,
        originalQueue: null,
        isShuffled: false,
      });
    }
  },
});
