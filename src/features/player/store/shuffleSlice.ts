import type { StateCreator } from 'zustand';
import type { PlaybackItem } from '../types';
import type { PlayerState } from './types';
import type { PlaybackSliceActions } from './playbackSlice';
import { shuffleQueueWithCurrent, splitStationTracks } from './playbackSlice';

export interface ShuffleSliceActions {
  toggleShuffle: () => void;
  playShuffled: (queue: PlaybackItem[]) => Promise<void>;
}

export type ShuffleSlice = ShuffleSliceActions;

export const createShuffleSlice: StateCreator<
  PlayerState & ShuffleSliceActions & PlaybackSliceActions,
  [],
  [],
  ShuffleSlice
> = (set, get) => ({
  toggleShuffle: () => {
    const { queue, cursor, currentTrack, isShuffled, originalQueue, stationQueueCount } = get();

    if (queue.length <= 1) return;

    if (!isShuffled) {
      if (!queue[cursor]) return;

      const { userTracks, stationTracks } = splitStationTracks(queue, stationQueueCount);

      set({
        originalQueue: queue,
        queue: [...shuffleQueueWithCurrent(userTracks, cursor), ...stationTracks],
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

  playShuffled: async (queue) => {
    if (queue.length === 0) return;
    const randomIndex = Math.floor(Math.random() * queue.length);
    set({ isShuffled: true });
    await get().play(queue, randomIndex);
  },
});
