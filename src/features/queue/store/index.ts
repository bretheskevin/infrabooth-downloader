import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { logger } from '@/lib/logger';
import { listen } from '@tauri-apps/api/event';
import type { DownloadProgressEvent, QueueProgressEvent, QueueCancelledEvent, QueueCompleteEvent } from '@/bindings';
import type { TrackStatus } from '@/features/queue/types/track';
import type { AppError } from '@/features/queue/types/errors';
import type { QueueState } from './types';
import { createQueueStateSlice } from './queueStateSlice';
import { createQueueProgressSlice } from './queueProgressSlice';
import { createQueueRetrySlice } from './queueRetrySlice';

export type { QueueState } from './types';
export type { Track, TrackStatus } from '@/features/queue/types/track';

export const useQueueStore = create<QueueState>()((...a) => ({
  ...createQueueStateSlice(...a),
  ...createQueueProgressSlice(...a),
  ...createQueueRetrySlice(...a),
}));

function setupQueueEventListeners() {
  const store = useQueueStore;

  listen<DownloadProgressEvent>('download-progress', (event) => {
    const { status, error, trackId, percent, downloadedBytes, totalBytes, filePath } = event.payload;
    void logger.debug(`[queueStore] download-progress: trackId=${trackId}, status=${status}`);
    if (error) {
      void logger.error(`[queueStore] Track error: ${error.code} - ${error.message}`);
    }
    store.getState().updateTrackStatus(trackId, status as TrackStatus, error as AppError | undefined, {
      percent: percent ?? undefined,
      downloadedBytes: downloadedBytes ?? undefined,
      totalBytes: totalBytes ?? undefined,
      filePath: filePath ?? undefined,
    });
  });

  listen<QueueProgressEvent>('queue-progress', (event) => {
    void logger.info(`[queueStore] queue-progress: ${event.payload.current}/${event.payload.total}`);
    store.getState().setQueueProgress(event.payload.current, event.payload.total);
  });

  listen<QueueCompleteEvent>('queue-complete', (event) => {
    void logger.info(`[queueStore] queue-complete: completed=${event.payload.completed}, failed=${event.payload.failed}`);
    store.getState().setQueueComplete(event.payload);
  });

  listen<QueueCancelledEvent>('queue-cancelled', (event) => {
    void logger.info(`[queueStore] queue-cancelled: completed=${event.payload.completed}, cancelled=${event.payload.cancelled}`);
    store.getState().setQueueCancelled(event.payload);
  });
}

setupQueueEventListeners();

export function waitForQueueIdle(timeoutMs = 10_000): Promise<void> {
  const state = useQueueStore.getState();
  if (!state.isProcessing && !state.isCancelling) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsub();
      resolve();
    }, timeoutMs);

    const unsub = useQueueStore.subscribe((s) => {
      if (!s.isProcessing && !s.isCancelling) {
        clearTimeout(timeout);
        unsub();
        resolve();
      }
    });
  });
}

export const useQueueProgress = () =>
  useQueueStore(
    useShallow((s) => ({
      isProcessing: s.isProcessing,
      isInitializing: s.isInitializing,
      isCancelling: s.isCancelling,
      isRetrying: s.isRetrying,
      currentIndex: s.currentIndex,
      totalTracks: s.totalTracks,
    })),
  );

export const useQueueCompletion = () =>
  useQueueStore(
    useShallow((s) => ({
      isComplete: s.isComplete,
      isCancelled: s.isCancelled,
      completedCount: s.completedCount,
      failedCount: s.failedCount,
      cancelledCount: s.cancelledCount,
    })),
  );
