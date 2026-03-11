import { useState, useCallback, useEffect } from 'react';
import { useUrlValidation, useMediaFetch, type FetchError } from '@/features/url-input';
import { useSyncToQueue } from './useSyncToQueue';
import { useQueueStore } from '@/features/queue/store';
import { useSettingsStore } from '@/features/settings/store';
import { startDownloadQueue } from '@/features/queue/api/download';
import { queueTrackToDownloadRequest, playlistTracksToQueueTracks, trackInfoToQueueTrack } from '@/features/queue/utils/transforms';
import { logger } from '@/lib/logger';
import type { ValidationResult, PlaylistInfo, TrackInfo } from '@/features/url-input';
import { isPlaylist } from '@/features/url-input';

interface UseDownloadFlowReturn {
  url: string;
  setUrl: (url: string) => void;
  validation: ValidationResult | null;
  isValidating: boolean;
  media: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: FetchError | null;
  isPending: boolean;
  handleDownload: (overrideOutputDir?: string) => void;
}

export function useDownloadFlow(initialUrl = ''): UseDownloadFlowReturn {
  const [url, setUrl] = useState(initialUrl);
  const [isPending, setIsPending] = useState(false);

  const isProcessing = useQueueStore((state) => state.isProcessing);
  const isComplete = useQueueStore((state) => state.isComplete);

  const { result: validation, isValidating } = useUrlValidation(url);
  const { data: fetchedMedia, isLoading: isFetching, error } = useMediaFetch(url, validation);

  // Track which URL produced the current media to avoid showing stale previews
  const [mediaUrl, setMediaUrl] = useState('');
  useEffect(() => {
    if (fetchedMedia && !isFetching) {
      setMediaUrl(url);
    }
  }, [fetchedMedia, isFetching, url]);
  const media = url === mediaUrl ? fetchedMedia : null;
  const isLoading = isFetching || (!!url && !media && !error && url !== mediaUrl);

  // Sync to queue whenever media changes
  useSyncToQueue(media);

  // Reset pending state when processing starts or completes (handles all-skipped and error cases)
  useEffect(() => {
    if (isProcessing || isComplete) {
      setIsPending(false);
    }
  }, [isProcessing, isComplete]);

  const handleDownload = useCallback(async (overrideOutputDir?: string) => {
    let { tracks: queueTracks } = useQueueStore.getState();
    const { setInitializing, setOutputDir } = useQueueStore.getState();
    const { downloadPath, maxConcurrentDownloads, preservePlaylistOrder } = useSettingsStore.getState();

    // Use override if provided, otherwise fall back to settings default
    const outputDir = overrideOutputDir || downloadPath || undefined;

    // Store the actual output dir used for this download (for "Open Folder" button)
    setOutputDir(outputDir || null);

    // If the download button is pressed before useSyncToQueue's effect fires,
    // the queue may still be empty. Populate it synchronously from media.
    if (queueTracks.length === 0 && media) {
      logger.info('[useDownloadFlow] Queue empty, populating from media');
      const newTracks = isPlaylist(media)
        ? playlistTracksToQueueTracks(media.tracks)
        : [trackInfoToQueueTrack(media)];
      useQueueStore.getState().enqueueTracks(newTracks);
      queueTracks = useQueueStore.getState().tracks;
    }

    logger.info(`[useDownloadFlow] handleDownload called with ${queueTracks.length} tracks`);
    logger.debug(`[useDownloadFlow] Download path: ${outputDir || 'default'}`);

    if (queueTracks.length === 0) {
      logger.warn('[useDownloadFlow] No tracks in queue and no media, aborting download');
      return;
    }

    // Set pending state while waiting for backend to start processing
    setIsPending(true);

    // Show initializing state before first download starts
    setInitializing(true);

    // Determine album name from media (playlist title or undefined for single track)
    const albumName = isPlaylist(media) ? media.title : undefined;
    logger.debug(`[useDownloadFlow] Album name: ${albumName ?? 'none (single track)'}`);

    try {
      await startDownloadQueue({
        tracks: queueTracks.map(queueTrackToDownloadRequest),
        albumName: albumName ?? null,
        outputDir: outputDir ?? null,
        maxConcurrent: maxConcurrentDownloads,
        preserveOrder: preservePlaylistOrder,
      });
    } catch (error) {
      logger.error(`[useDownloadFlow] Download failed: ${error}`);
      setIsPending(false);
      useQueueStore.getState().setInitializing(false);
    }
  }, [media]);

  return {
    url,
    setUrl,
    validation,
    isValidating,
    media,
    isLoading,
    error,
    isPending,
    handleDownload,
  };
}
