import type { StateCreator } from 'zustand';
import { logger } from '@/lib/logger';
import { isRetryableFailure } from '@/lib/errorMessages';
import type { QueueState, QueueRetrySlice } from './types';

export const createQueueRetrySlice: StateCreator<QueueState, [], [], QueueRetrySlice> = (set, get) => ({
  isRetrying: false,

  prepareRetryFailed: () => {
    const { tracks } = get();
    const failedTracks = tracks.filter(isRetryableFailure);
    const skippedCount = tracks.filter((t) => t.status === 'failed').length - failedTracks.length;

    if (failedTracks.length === 0) {
      void logger.warn(`[queueStore] No retryable failed tracks (${skippedCount} DRM-protected skipped)`);
      return [];
    }

    void logger.info(`[queueStore] Preparing retry for ${failedTracks.length} failed tracks (${skippedCount} DRM-protected skipped)`);

    const retryIds = new Set(failedTracks.map((t) => t.id));
    set((s) => ({
      tracks: s.tracks.map((track) => (retryIds.has(track.id) ? { ...track, status: 'pending' as const, error: undefined } : track)),
      isComplete: false,
      isCancelled: false,
      failedCount: skippedCount,
      isRetrying: false,
    }));

    return failedTracks;
  },

  prepareRetrySingle: (trackId) => {
    const { tracks } = get();
    const track = tracks.find((t) => t.id === trackId && isRetryableFailure(t));

    if (!track) {
      void logger.warn(`[queueStore] Track ${trackId} not found, not failed, or DRM-protected`);
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
