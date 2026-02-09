import { useState, useCallback } from 'react';
import { useUrlValidation } from './useUrlValidation';
import { useMediaFetch, type FetchError } from './useMediaFetch';
import { useSyncToQueue } from './useSyncToQueue';
import { useQueueStore } from '@/stores/queueStore';
import { startDownloadQueue } from '@/lib/download';
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
    const queueTracks = useQueueStore.getState().tracks;

    if (queueTracks.length === 0) {
      return;
    }

    // Determine album name from media (playlist title or undefined for single track)
    const albumName = isPlaylist(media) ? media.title : undefined;

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
    });
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
