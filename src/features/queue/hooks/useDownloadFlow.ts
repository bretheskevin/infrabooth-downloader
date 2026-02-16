import { useState, useCallback, useEffect } from 'react';
import { useUrlValidation, useMediaFetch, type FetchError } from '@/features/url-input';
import { useSyncToQueue } from './useSyncToQueue';
import { useQueueStore } from '@/features/queue/store';
import { useSettingsStore } from '@/features/settings/store';
import { startDownloadQueue } from '@/features/queue/api/download';
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

export function useDownloadFlow(): UseDownloadFlowReturn {
  const [url, setUrl] = useState('');
  const [isPending, setIsPending] = useState(false);

  const isProcessing = useQueueStore((state) => state.isProcessing);

  const { result: validation, isValidating } = useUrlValidation(url);
  const { data: media, isLoading, error } = useMediaFetch(url, validation);

  // Sync to queue whenever media changes
  useSyncToQueue(media);

  // Reset pending state when processing starts
  useEffect(() => {
    if (isProcessing) {
      setIsPending(false);
    }
  }, [isProcessing]);

  const handleDownload = useCallback(async (overrideOutputDir?: string) => {
    const { tracks: queueTracks, setInitializing, setOutputDir } = useQueueStore.getState();
    const { downloadPath } = useSettingsStore.getState();

    // Use override if provided, otherwise fall back to settings default
    const outputDir = overrideOutputDir || downloadPath || undefined;

    // Store the actual output dir used for this download (for "Open Folder" button)
    setOutputDir(outputDir || null);

    logger.info(`[useDownloadFlow] handleDownload called with ${queueTracks.length} tracks`);
    logger.debug(`[useDownloadFlow] Download path: ${outputDir || 'default'}`);

    if (queueTracks.length === 0) {
      logger.warn('[useDownloadFlow] No tracks in queue, aborting download');
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
        tracks: queueTracks.map((t) => ({
          // Use SoundCloud API URL format which yt-dlp can resolve
          trackUrl: `https://api.soundcloud.com/tracks/${t.id}`,
          trackId: t.id,
          title: t.title,
          artist: t.artist,
          artworkUrl: t.artworkUrl ?? null,
        })),
        albumName: albumName ?? null,
        outputDir: outputDir ?? null,
      });
    } catch (error) {
      logger.error(`[useDownloadFlow] Download failed: ${error}`);
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
