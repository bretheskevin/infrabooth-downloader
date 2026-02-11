import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { Track, TrackStatus } from '@/types/track';
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
};

export const useQueueStore = create<QueueState>((set) => ({
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
}));
