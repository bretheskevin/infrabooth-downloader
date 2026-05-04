import type { StateCreator } from 'zustand';
import type { PlaybackItem } from '../types';
import type { AutoplaySliceState, PlayerState } from './types';

export interface AutoplaySliceActions {
  appendStationTracks: (items: PlaybackItem[]) => void;
}

type AutoplaySlice = StateCreator<PlayerState & AutoplaySliceActions, [], [], AutoplaySliceState & AutoplaySliceActions>;

export const createAutoplaySlice: AutoplaySlice = (set, get) => ({
  stationQueueCount: 0,
  autoplayInFlight: false,

  appendStationTracks: (items) => {
    const { queue, stationQueueCount } = get();
    const existingIds = new Set(queue.map((t) => t.trackId));
    const unique = items.filter((t) => !existingIds.has(t.trackId));
    if (unique.length === 0) return;
    set({
      queue: [...queue, ...unique],
      stationQueueCount: stationQueueCount + unique.length,
    });
  },
});
