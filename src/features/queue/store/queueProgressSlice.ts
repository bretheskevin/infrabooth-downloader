import type { StateCreator } from 'zustand';
import { logger } from '@/lib/logger';
import type { QueueState, QueueProgressSlice } from './types';

export const createQueueProgressSlice: StateCreator<QueueState, [], [], QueueProgressSlice> = (set) => ({
  isComplete: false,
  isCancelling: false,
  isCancelled: false,
  completedCount: 0,
  failedCount: 0,
  cancelledCount: 0,

  setQueueProgress: (current, total) => {
    void logger.debug(`[queueStore] Queue progress: ${current}/${total}`);
    set({
      currentIndex: current - 1,
      totalTracks: total,
      isProcessing: true,
      isInitializing: false,
    });
  },

  setQueueComplete: (result) => {
    void logger.info(`[queueStore] Queue complete: ${result.completed} completed, ${result.failed} failed`);
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
    void logger.info(`[queueStore] Queue cancelled: ${result.completed} completed, ${result.cancelled} cancelled`);
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
    void logger.info(`[queueStore] Cancelling: ${isCancelling}`);
    set({ isCancelling });
  },
});
