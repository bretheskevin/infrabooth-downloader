import { create } from 'zustand';
import type { Track, TrackStatus } from '@/types/track';
import type { QueueCompleteEvent } from '@/types/events';

export type { Track, TrackStatus };

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  totalTracks: number;
  isProcessing: boolean;
  isComplete: boolean;
  completedCount: number;
  failedCount: number;
  isRateLimited: boolean;
  rateLimitedAt: number | null;
  // Actions
  enqueueTracks: (tracks: Track[]) => void;
  updateTrackStatus: (
    id: string,
    status: Track['status'],
    error?: Track['error']
  ) => void;
  setQueueProgress: (current: number, total: number) => void;
  setQueueComplete: (result: QueueCompleteEvent) => void;
  clearQueue: () => void;
  setRateLimited: (isLimited: boolean) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  tracks: [],
  currentIndex: 0,
  totalTracks: 0,
  isProcessing: false,
  isComplete: false,
  completedCount: 0,
  failedCount: 0,
  isRateLimited: false,
  rateLimitedAt: null,

  enqueueTracks: (tracks) =>
    set({
      tracks,
      totalTracks: tracks.length,
      currentIndex: 0,
      isProcessing: false,
      isComplete: false,
      completedCount: 0,
      failedCount: 0,
      isRateLimited: false,
      rateLimitedAt: null,
    }),

  updateTrackStatus: (id, status, error) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === id ? { ...track, status, error } : track
      ),
    })),

  setQueueProgress: (current, total) =>
    set({
      currentIndex: current,
      totalTracks: total,
      isProcessing: true,
    }),

  setQueueComplete: (result) =>
    set({
      isProcessing: false,
      isComplete: true,
      completedCount: result.completed,
      failedCount: result.failed,
    }),

  clearQueue: () =>
    set({
      tracks: [],
      currentIndex: 0,
      totalTracks: 0,
      isProcessing: false,
      isComplete: false,
      completedCount: 0,
      failedCount: 0,
      isRateLimited: false,
      rateLimitedAt: null,
    }),

  setRateLimited: (isLimited) =>
    set({
      isRateLimited: isLimited,
      rateLimitedAt: isLimited ? Date.now() : null,
    }),
}));
