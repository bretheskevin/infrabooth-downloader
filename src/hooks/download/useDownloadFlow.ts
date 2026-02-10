import { useState, useCallback } from 'react';
import { useUrlValidation } from './useUrlValidation';
import { useMediaFetch, type FetchError } from './useMediaFetch';
import { useSyncToQueue } from './useSyncToQueue';
import { useQueueStore } from '@/stores/queueStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { startDownloadQueue } from '@/lib/download';
import { logger } from '@/lib/logger';
import type { ValidationResult } from '@/types/url';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

interface UseDownloadFlowReturn {
  url: string;
  setUrl: (url: string) => void;
  validation: ValidationResult | null;
  isValidating: boolean;
  media: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: FetchError | null;
  handleDownload: () => void;
}

function isPlaylist(
  media: PlaylistInfo | TrackInfo | null
): media is PlaylistInfo {
  return media !== null && 'tracks' in media;
}

export function useDownloadFlow(): UseDownloadFlowReturn {
  const [url, setUrl] = useState('');

  const { result: validation, isValidating } = useUrlValidation(url);
  const { data: media, isLoading, error } = useMediaFetch(url, validation);

  // Sync to queue whenever media changes
  useSyncToQueue(media);

  const handleDownload = useCallback(async () => {
    const { tracks: queueTracks, setInitializing } = useQueueStore.getState();
    const { downloadPath } = useSettingsStore.getState();

    logger.info(`[useDownloadFlow] handleDownload called with ${queueTracks.length} tracks`);
    logger.debug(`[useDownloadFlow] Download path: ${downloadPath || 'default'}`);

    if (queueTracks.length === 0) {
      logger.warn('[useDownloadFlow] No tracks in queue, aborting download');
      return;
    }

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
          artworkUrl: t.artworkUrl ?? undefined,
        })),
        albumName,
        outputDir: downloadPath || undefined,
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
    handleDownload,
  };
}
