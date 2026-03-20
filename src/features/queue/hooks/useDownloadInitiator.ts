import { useCallback } from 'react';
import type { PlaylistInfo, TrackInfo } from '@/bindings';
import { useQueueStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import { startDownloadQueue } from '../api/download';
import {
  playlistTracksToQueueTracks,
  trackInfoToQueueTrack,
  queueTrackToDownloadRequest,
} from '../utils/transforms';
import { isPlaylist } from '@/features/url-input';
import { logger } from '@/lib/logger';

type MediaInfo = PlaylistInfo | TrackInfo;

export function useDownloadInitiator() {
  const enqueueTracks = useQueueStore((s) => s.enqueueTracks);
  const setInitializing = useQueueStore((s) => s.setInitializing);
  const setOutputDir = useQueueStore((s) => s.setOutputDir);
  const defaultDownloadPath = useSettingsStore((s) => s.downloadPath);
  const maxConcurrentDownloads = useSettingsStore((s) => s.maxConcurrentDownloads);
  const preservePlaylistOrder = useSettingsStore((s) => s.preservePlaylistOrder);

  const initiateDownload = useCallback(
    async (mediaInfo: MediaInfo, outputDirOverride?: string) => {
      const outputDir = outputDirOverride ?? defaultDownloadPath;
      if (!outputDir) {
        throw new Error('No output directory configured');
      }

      const queueTracks = isPlaylist(mediaInfo)
        ? playlistTracksToQueueTracks(mediaInfo.tracks)
        : [trackInfoToQueueTrack(mediaInfo)];

      void logger.info(
        `[useDownloadInitiator] Initiating download for ${queueTracks.length} tracks`
      );

      enqueueTracks(queueTracks);
      setOutputDir(outputDir);
      setInitializing(true);

      const albumName = isPlaylist(mediaInfo) ? mediaInfo.title : undefined;

      try {
        await startDownloadQueue({
          tracks: queueTracks.map(queueTrackToDownloadRequest),
          albumName: albumName ?? null,
          outputDir,
          maxConcurrent: maxConcurrentDownloads,
          preserveOrder: preservePlaylistOrder,
        });
      } catch (error) {
        void logger.error(`[useDownloadInitiator] Download failed: ${error}`);
        setInitializing(false);
        throw error;
      }
    },
    [
      enqueueTracks,
      setInitializing,
      setOutputDir,
      defaultDownloadPath,
      maxConcurrentDownloads,
      preservePlaylistOrder,
    ]
  );

  return { initiateDownload };
}
