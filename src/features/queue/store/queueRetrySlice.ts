import type { StateCreator } from 'zustand';
import { logger } from '@/lib/logger';
import type { QueueState, QueueRetrySlice } from './types';

export const createQueueRetrySlice: StateCreator<QueueState, [], [], QueueRetrySlice> = (set, get) => ({
  isRetrying: false,

  prepareRetryFailed: () => {
    const { tracks } = get();
    const failedTracks = tracks.filter((t) => t.status === 'failed');

    if (failedTracks.length === 0) {
      void logger.warn('[queueStore] No failed tracks to retry');
      return [];
    }

    void logger.info(`[queueStore] Preparing retry for ${failedTracks.length} failed tracks`);

    set((s) => ({
      tracks: s.tracks.map((track) => (track.status === 'failed' ? { ...track, status: 'pending' as const, error: undefined } : track)),
      isComplete: false,
      isCancelled: false,
      failedCount: 0,
      isRetrying: false,
    }));

    return failedTracks;
  },

  prepareRetrySingle: (trackId) => {
    const { tracks } = get();
    const track = tracks.find((t) => t.id === trackId && t.status === 'failed');

    if (!track) {
      void logger.warn(`[queueStore] Track ${trackId} not found or not failed`);
      return null;
    }

    void logger.info(`[queueStore] Preparing retry for track: ${track.title}`);

    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, status: 'pending' as const, error: undefined } : t)),
      isComplete: false,
      isCancelled: false,
      failedCount: Math.max(0, s.failedCount - 1),
      isRetrying: false,
    }));

    return track;
  },

  setRetrying: (isRetrying) => {
    void logger.debug(`[queueStore] Retrying: ${isRetrying}`);
    set({ isRetrying });
  },
});
