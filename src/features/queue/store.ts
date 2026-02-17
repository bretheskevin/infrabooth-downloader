import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { Track, TrackStatus } from '@/features/queue/types/track';
import type { QueueCancelledEvent, QueueCompleteEvent } from '@/types/events';

export type { Track, TrackStatus };

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  totalTracks: number;
  isProcessing: boolean;
  isInitializing: boolean;
  isComplete: boolean;
  isCancelling: boolean;
  isCancelled: boolean;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  isRateLimited: boolean;
  rateLimitedAt: number | null;
  outputDir: string | null;
  isRetrying: boolean;
  // Actions
  enqueueTracks: (tracks: Track[]) => void;
  updateTrackStatus: (
    id: string,
    status: Track['status'],
    error?: Track['error']
  ) => void;
  setQueueProgress: (current: number, total: number) => void;
  setQueueComplete: (result: QueueCompleteEvent) => void;
  setQueueCancelled: (result: QueueCancelledEvent) => void;
  setCancelling: (isCancelling: boolean) => void;
  clearQueue: () => void;
  setRateLimited: (isLimited: boolean) => void;
  setInitializing: (isInitializing: boolean) => void;
  setOutputDir: (path: string | null) => void;
  prepareRetryFailed: () => Track[];
  prepareRetrySingle: (trackId: string) => Track | null;
  setRetrying: (isRetrying: boolean) => void;
}

const INITIAL_QUEUE_STATE = {
  currentIndex: 0,
  isProcessing: false,
  isInitializing: false,
  isComplete: false,
  isCancelling: false,
  isCancelled: false,
  completedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
  isRateLimited: false,
  rateLimitedAt: null as number | null,
  outputDir: null as string | null,
  isRetrying: false,
};

export const useQueueStore = create<QueueState>((set, get) => ({
  tracks: [],
  totalTracks: 0,
  ...INITIAL_QUEUE_STATE,

  enqueueTracks: (tracks) => {
    logger.info(`[queueStore] Enqueueing ${tracks.length} tracks`);
    set({
      ...INITIAL_QUEUE_STATE,
      tracks,
      totalTracks: tracks.length,
    });
  },

  updateTrackStatus: (id, status, error) => {
    logger.debug(`[queueStore] Track ${id} status: ${status}${error ? ` (error: ${error.code})` : ''}`);
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === id ? { ...track, status, error } : track
      ),
    }));
  },

  setQueueProgress: (current, total) => {
    logger.debug(`[queueStore] Queue progress: ${current}/${total}`);
    set({
      // current is 1-indexed from backend (e.g., "1 of 12"), convert to 0-indexed for array access
      currentIndex: current - 1,
      totalTracks: total,
      isProcessing: true,
      isInitializing: false,
    });
  },

  setQueueComplete: (result) => {
    logger.info(`[queueStore] Queue complete: ${result.completed} completed, ${result.failed} failed`);
    set({
      isProcessing: false,
      isComplete: true,
      isCancelling: false,
      isRetrying: false,
      completedCount: result.completed,
      failedCount: result.failed,
    });
  },

  setQueueCancelled: (result) => {
    logger.info(`[queueStore] Queue cancelled: ${result.completed} completed, ${result.cancelled} cancelled`);
    set({
      isProcessing: false,
      isComplete: true,
      isCancelling: false,
      isCancelled: true,
      isRetrying: false,
      completedCount: result.completed,
      cancelledCount: result.cancelled,
    });
  },

  setCancelling: (isCancelling) => {
    logger.info(`[queueStore] Cancelling: ${isCancelling}`);
    set({ isCancelling });
  },

  clearQueue: () => {
    logger.info('[queueStore] Clearing queue');
    set({
      tracks: [],
      totalTracks: 0,
      ...INITIAL_QUEUE_STATE,
    });
  },

  setRateLimited: (isLimited) => {
    if (isLimited) {
      logger.warn('[queueStore] Rate limited!');
    }
    set({
      isRateLimited: isLimited,
      rateLimitedAt: isLimited ? Date.now() : null,
    });
  },

  setInitializing: (isInitializing) => {
    logger.debug(`[queueStore] Initializing: ${isInitializing}`);
    set({
      isInitializing,
    });
  },

  setOutputDir: (path) => {
    logger.debug(`[queueStore] Output dir: ${path || 'default'}`);
    set({ outputDir: path });
  },

  prepareRetryFailed: () => {
    const { tracks } = get();
    const failedTracks = tracks.filter((t) => t.status === 'failed');

    if (failedTracks.length === 0) {
      logger.warn('[queueStore] No failed tracks to retry');
      return [];
    }

    logger.info(`[queueStore] Preparing retry for ${failedTracks.length} failed tracks`);

    set((s) => ({
      tracks: s.tracks.map((track) =>
        track.status === 'failed'
          ? { ...track, status: 'pending' as const, error: undefined }
          : track
      ),
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
      logger.warn(`[queueStore] Track ${trackId} not found or not failed`);
      return null;
    }

    logger.info(`[queueStore] Preparing retry for track: ${track.title}`);

    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === trackId
          ? { ...t, status: 'pending' as const, error: undefined }
          : t
      ),
      isComplete: false,
      isCancelled: false,
      failedCount: Math.max(0, s.failedCount - 1),
      isRetrying: false,
    }));

    return track;
  },

  setRetrying: (isRetrying) => {
    logger.debug(`[queueStore] Retrying: ${isRetrying}`);
    set({ isRetrying });
  },
}));
