import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueueStore } from '@/features/download/store';
import { logger } from '@/lib/logger';
import type {
  DownloadProgressEvent,
  QueueCancelledEvent,
  QueueProgressEvent,
  QueueCompleteEvent,
} from '@/types/events';

/**
 * Hook that subscribes to download and queue progress events from the Rust backend.
 *
 * This hook listens to four event channels:
 * - `download-progress`: Per-track status updates
 * - `queue-progress`: Overall queue progress (X of Y)
 * - `queue-complete`: Final results when queue finishes
 * - `queue-cancelled`: When queue is cancelled by user
 *
 * All events update the queue store automatically.
 */
export function useDownloadProgress(): void {
  const updateTrackStatus = useQueueStore((state) => state.updateTrackStatus);
  const setQueueProgress = useQueueStore((state) => state.setQueueProgress);
  const setQueueComplete = useQueueStore((state) => state.setQueueComplete);
  const setQueueCancelled = useQueueStore((state) => state.setQueueCancelled);
  const setRateLimited = useQueueStore((state) => state.setRateLimited);

  useEffect(() => {
    logger.debug('[useDownloadProgress] Setting up event listeners');

    const unlistenProgress = listen<DownloadProgressEvent>(
      'download-progress',
      (event) => {
        const { status, error, trackId } = event.payload;
        logger.debug(`[useDownloadProgress] download-progress: trackId=${trackId}, status=${status}`);

        // Handle rate limit detection
        if (status === 'rate_limited' || error?.code === 'RATE_LIMITED') {
          logger.warn(`[useDownloadProgress] Rate limit detected for track ${trackId}`);
          setRateLimited(true);
        } else if (status === 'downloading' || status === 'converting') {
          // Clear rate limit when processing resumes
          setRateLimited(false);
        }

        if (error) {
          logger.error(`[useDownloadProgress] Track error: ${error.code} - ${error.message}`);
        }

        updateTrackStatus(
          event.payload.trackId,
          event.payload.status,
          event.payload.error
        );
      }
    );

    const unlistenQueueProgress = listen<QueueProgressEvent>(
      'queue-progress',
      (event) => {
        logger.info(`[useDownloadProgress] queue-progress: ${event.payload.current}/${event.payload.total}`);
        setQueueProgress(event.payload.current, event.payload.total);
      }
    );

    const unlistenComplete = listen<QueueCompleteEvent>(
      'queue-complete',
      (event) => {
        logger.info(`[useDownloadProgress] queue-complete: completed=${event.payload.completed}, failed=${event.payload.failed}`);
        setQueueComplete(event.payload);
      }
    );

    const unlistenCancelled = listen<QueueCancelledEvent>(
      'queue-cancelled',
      (event) => {
        logger.info(`[useDownloadProgress] queue-cancelled: completed=${event.payload.completed}, cancelled=${event.payload.cancelled}`);
        setQueueCancelled(event.payload);
      }
    );

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenQueueProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
      unlistenCancelled.then((fn) => fn());
    };
  }, [updateTrackStatus, setQueueProgress, setQueueComplete, setQueueCancelled, setRateLimited]);
}
