import { useCallback } from 'react';
import { useQueueStore, type Track } from '@/features/queue/store';
import { startDownloadQueue } from '@/features/queue/api/download';
import { queueTrackToDownloadRequest } from '@/features/queue/utils/transforms';
import { logger } from '@/lib/logger';

interface UseRetryTracksReturn {
  isRetrying: boolean;
  retryAllFailed: () => Promise<void>;
  retrySingleTrack: (trackId: string) => Promise<void>;
  canRetry: boolean;
}

async function executeRetry(tracks: Track[], logMessage: string): Promise<void> {
  const { setRetrying, setInitializing, outputDir } = useQueueStore.getState();

  setRetrying(true);
  setInitializing(true);

  logger.info(logMessage);

  try {
    await startDownloadQueue({
      tracks: tracks.map(queueTrackToDownloadRequest),
      albumName: null,
      outputDir: outputDir ?? null,
    });
  } catch (error) {
    logger.error(`[useRetryTracks] Retry failed: ${error}`);
    setRetrying(false);
  }
}

export function useRetryTracks(): UseRetryTracksReturn {
  const isRetrying = useQueueStore((state) => state.isRetrying);
  const failedCount = useQueueStore((state) => state.failedCount);
  const isProcessing = useQueueStore((state) => state.isProcessing);

  const canRetry = failedCount > 0 && !isProcessing && !isRetrying;

  const retryAllFailed = useCallback(async () => {
    const { prepareRetryFailed } = useQueueStore.getState();
    const failedTracks = prepareRetryFailed();
    if (failedTracks.length === 0) return;

    await executeRetry(
      failedTracks,
      `[useRetryTracks] Retrying ${failedTracks.length} failed tracks`
    );
  }, []);

  const retrySingleTrack = useCallback(async (trackId: string) => {
    const { prepareRetrySingle } = useQueueStore.getState();
    const track = prepareRetrySingle(trackId);
    if (!track) return;

    await executeRetry([track], `[useRetryTracks] Retrying single track: ${track.title}`);
  }, []);

  return {
    isRetrying,
    retryAllFailed,
    retrySingleTrack,
    canRetry,
  };
}
