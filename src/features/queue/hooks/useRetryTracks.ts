import { useCallback } from 'react';
import { useQueueStore, type Track } from '@/features/queue/store';
import { startDownloadQueue } from '@/features/queue/api/download';
import { logger } from '@/lib/logger';

interface UseRetryTracksReturn {
  isRetrying: boolean;
  retryAllFailed: () => Promise<void>;
  retrySingleTrack: (trackId: string) => Promise<void>;
  canRetry: boolean;
}

export function useRetryTracks(): UseRetryTracksReturn {
  const isRetrying = useQueueStore((state) => state.isRetrying);
  const failedCount = useQueueStore((state) => state.failedCount);
  const isProcessing = useQueueStore((state) => state.isProcessing);

  const canRetry = failedCount > 0 && !isProcessing && !isRetrying;

  const retryAllFailed = useCallback(async () => {
    const { prepareRetryFailed, setRetrying, setInitializing, outputDir } =
      useQueueStore.getState();

    const failedTracks = prepareRetryFailed();
    if (failedTracks.length === 0) return;

    setRetrying(true);
    setInitializing(true);

    logger.info(`[useRetryTracks] Retrying ${failedTracks.length} failed tracks`);

    try {
      await startDownloadQueue({
        tracks: failedTracks.map((t: Track) => ({
          trackUrl: `https://api.soundcloud.com/tracks/${t.id}`,
          trackId: t.id,
          title: t.title,
          artist: t.artist,
          artworkUrl: t.artworkUrl ?? null,
        })),
        albumName: null,
        outputDir: outputDir ?? null,
      });
    } catch (error) {
      logger.error(`[useRetryTracks] Retry failed: ${error}`);
      setRetrying(false);
    }
  }, []);

  const retrySingleTrack = useCallback(async (trackId: string) => {
    const { prepareRetrySingle, setRetrying, setInitializing, outputDir } =
      useQueueStore.getState();

    const track = prepareRetrySingle(trackId);
    if (!track) return;

    setRetrying(true);
    setInitializing(true);

    logger.info(`[useRetryTracks] Retrying single track: ${track.title}`);

    try {
      await startDownloadQueue({
        tracks: [
          {
            trackUrl: `https://api.soundcloud.com/tracks/${track.id}`,
            trackId: track.id,
            title: track.title,
            artist: track.artist,
            artworkUrl: track.artworkUrl ?? null,
          },
        ],
        albumName: null,
        outputDir: outputDir ?? null,
      });
    } catch (error) {
      logger.error(`[useRetryTracks] Single retry failed: ${error}`);
      setRetrying(false);
    }
  }, []);

  return {
    isRetrying,
    retryAllFailed,
    retrySingleTrack,
    canRetry,
  };
}
