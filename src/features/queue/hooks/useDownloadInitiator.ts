import { useCallback } from 'react';
import type { PlaylistInfo, TrackInfo } from '@/bindings';
import { useQueueStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import { playlistTracksToQueueTracks, trackInfoToQueueTrack } from '../utils/transforms';
import { dispatchDownloadQueue } from '../utils/dispatchDownloadQueue';
import { isPlaylist } from '@/features/url-input';
import { logger } from '@/lib/logger';

type MediaInfo = PlaylistInfo | TrackInfo;

export function useDownloadInitiator() {
  const enqueueTracks = useQueueStore((s) => s.enqueueTracks);
  const setInitializing = useQueueStore((s) => s.setInitializing);
  const setOutputDir = useQueueStore((s) => s.setOutputDir);
  const setBatchTitle = useQueueStore((s) => s.setBatchTitle);
  const defaultDownloadPath = useSettingsStore((s) => s.downloadPath);
  const maxConcurrentDownloads = useSettingsStore((s) => s.maxConcurrentDownloads);
  const preservePlaylistOrder = useSettingsStore((s) => s.preservePlaylistOrder);

  const initiateDownload = useCallback(
    async (mediaInfo: MediaInfo, outputDirOverride?: string) => {
      const outputDir = outputDirOverride ?? defaultDownloadPath;
      if (!outputDir) {
        throw new Error('No output directory configured');
      }

      const queueTracks = isPlaylist(mediaInfo) ? playlistTracksToQueueTracks(mediaInfo.tracks) : [trackInfoToQueueTrack(mediaInfo)];

      void logger.info(`[useDownloadInitiator] Initiating download for ${queueTracks.length} tracks`);

      const albumName = isPlaylist(mediaInfo) ? mediaInfo.title : undefined;

      try {
        await dispatchDownloadQueue({
          queueTracks,
          albumName: albumName ?? null,
          outputDir,
          maxConcurrent: maxConcurrentDownloads,
          preserveOrder: preservePlaylistOrder,
          enqueueTracks,
          setOutputDir,
          setBatchTitle,
          setInitializing,
        });
      } catch (error) {
        void logger.error(`[useDownloadInitiator] Download failed: ${error}`);
        throw error;
      }
    },
    [enqueueTracks, setInitializing, setOutputDir, setBatchTitle, defaultDownloadPath, maxConcurrentDownloads, preservePlaylistOrder],
  );

  return { initiateDownload };
}
