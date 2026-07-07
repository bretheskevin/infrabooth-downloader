import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQueueStore } from '../store';
import { cancelDownloadQueue } from '../api/download';
import { waitForQueueIdle } from '../store';
import { trackInfoToQueueTrack } from '../utils/transforms';
import { dispatchDownloadQueue } from '../utils/dispatchDownloadQueue';
import { useSettingsStore } from '@/features/settings';
import { logger } from '@/lib/logger';
import type { TrackInfo } from '@/bindings';

interface PendingDownload {
  tracks: TrackInfo[];
  playlistTitle: string;
  outputDir?: string;
}

interface UseLibraryDownloadOptions {
  onNavigateToDownload: () => void;
}

export function useLibraryDownload({ onNavigateToDownload }: UseLibraryDownloadOptions) {
  const { t } = useTranslation();
  const [pendingDownload, setPendingDownload] = useState<PendingDownload | null>(null);

  const executeDownload = useCallback(
    async (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => {
      const { isComplete, failedCount, clearQueue } = useQueueStore.getState();
      const { downloadPath, maxConcurrentDownloads, preservePlaylistOrder } = useSettingsStore.getState();

      if (isComplete && failedCount > 0) return;
      if (isComplete) clearQueue();

      const effectiveOutputDir = outputDir || downloadPath || null;
      const queueTracks = tracks.map(trackInfoToQueueTrack);
      const { enqueueTracks, setOutputDir, setBatchTitle, setInitializing } = useQueueStore.getState();

      onNavigateToDownload();

      try {
        await dispatchDownloadQueue({
          queueTracks,
          albumName: playlistTitle,
          outputDir: effectiveOutputDir,
          maxConcurrent: maxConcurrentDownloads,
          preserveOrder: preservePlaylistOrder,
          enqueueTracks,
          setOutputDir,
          setBatchTitle,
          setInitializing,
        });
      } catch (error) {
        logger.error(`[useLibraryDownload] Download failed: ${error}`);
      }
    },
    [onNavigateToDownload],
  );

  const handleDownloadTracks = useCallback(
    (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => {
      const { isProcessing, isCancelling } = useQueueStore.getState();

      if (isProcessing || isCancelling) {
        setPendingDownload({ tracks, playlistTitle, outputDir });
        return;
      }

      executeDownload(tracks, playlistTitle, outputDir);
    },
    [executeDownload],
  );

  const handleConfirmReplace = useCallback(async () => {
    if (!pendingDownload) return;
    const { tracks, playlistTitle, outputDir } = pendingDownload;
    setPendingDownload(null);

    try {
      await cancelDownloadQueue();
      await waitForQueueIdle();
    } catch (error) {
      logger.error(`[useLibraryDownload] Failed to cancel current download: ${error}`);
      toast.error(t('library.detail.conflictError'));
      return;
    }

    useQueueStore.getState().clearQueue();
    executeDownload(tracks, playlistTitle, outputDir);
  }, [pendingDownload, executeDownload, t]);

  const handleCancelReplace = useCallback(() => {
    setPendingDownload(null);
  }, []);

  return {
    handleDownloadTracks,
    pendingDownload,
    handleConfirmReplace,
    handleCancelReplace,
  };
}
