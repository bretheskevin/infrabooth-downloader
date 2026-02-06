import { create } from 'zustand';
import type { Track, TrackStatus } from '@/types/track';

export type { Track, TrackStatus };

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  // Actions
  setTracks: (tracks: Track[]) => void;
  updateTrackStatus: (
    id: string,
    status: Track['status'],
    error?: Track['error']
  ) => void;
  clearQueue: () => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  tracks: [],
  currentIndex: 0,
  setTracks: (tracks) => set({ tracks }),
  updateTrackStatus: (id, status, error) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === id ? { ...track, status, error } : track
      ),
    })),
  clearQueue: () => set({ tracks: [], currentIndex: 0 }),
}));
