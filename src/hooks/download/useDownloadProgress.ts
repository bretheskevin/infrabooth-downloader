import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueueStore } from '@/stores/queueStore';
import type {
  DownloadProgressEvent,
  QueueProgressEvent,
  QueueCompleteEvent,
} from '@/types/events';

/**
 * Hook that subscribes to download and queue progress events from the Rust backend.
 *
 * This hook listens to three event channels:
 * - `download-progress`: Per-track status updates
 * - `queue-progress`: Overall queue progress (X of Y)
 * - `queue-complete`: Final results when queue finishes
 *
 * All events update the queue store automatically.
 */
export function useDownloadProgress(): void {
  const updateTrackStatus = useQueueStore((state) => state.updateTrackStatus);
  const setQueueProgress = useQueueStore((state) => state.setQueueProgress);
  const setQueueComplete = useQueueStore((state) => state.setQueueComplete);
  const setRateLimited = useQueueStore((state) => state.setRateLimited);

  useEffect(() => {
    const unlistenProgress = listen<DownloadProgressEvent>(
      'download-progress',
      (event) => {
        const { status, error } = event.payload;

        // Handle rate limit detection
        if (status === 'rate_limited' || error?.code === 'RATE_LIMITED') {
          setRateLimited(true);
        } else if (status === 'downloading' || status === 'converting') {
          // Clear rate limit when processing resumes
          setRateLimited(false);
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
        setQueueProgress(event.payload.current, event.payload.total);
      }
    );

    const unlistenComplete = listen<QueueCompleteEvent>(
      'queue-complete',
      (event) => {
        setQueueComplete(event.payload);
      }
    );

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenQueueProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, [updateTrackStatus, setQueueProgress, setQueueComplete, setRateLimited]);
}
