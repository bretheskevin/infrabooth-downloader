import { useQueueStore } from '@/features/queue/store';
import { useSettingsStore } from '@/features/settings/store';
import { logger } from '@/lib/logger';
import type { Track } from '../types/track';
import { dispatchDownloadQueue } from './dispatchDownloadQueue';

export async function startPlaylistDownload(queueTracks: Track[], playlistTitle: string, outputDir?: string): Promise<void> {
  const { isComplete, failedCount, clearQueue } = useQueueStore.getState();
  const { downloadPath, maxConcurrentDownloads, preservePlaylistOrder } = useSettingsStore.getState();

  if (isComplete && failedCount > 0) {
    void logger.warn(`[startPlaylistDownload] Skipped "${playlistTitle}": previous queue still has ${failedCount} failed tracks`);
    return;
  }
  if (isComplete) clearQueue();

  const effectiveOutputDir = outputDir || downloadPath || null;
  void logger.info(
    `[startPlaylistDownload] "${playlistTitle}": ${queueTracks.length} tracks, outputDir=${effectiveOutputDir ?? '<system default>'} (override=${outputDir ?? 'none'}), maxConcurrent=${maxConcurrentDownloads}, preserveOrder=${preservePlaylistOrder}`,
  );
  const { enqueueTracks, setOutputDir, setInitializing } = useQueueStore.getState();

  try {
    await dispatchDownloadQueue({
      queueTracks,
      albumName: playlistTitle,
      outputDir: effectiveOutputDir,
      maxConcurrent: maxConcurrentDownloads,
      preserveOrder: preservePlaylistOrder,
      enqueueTracks,
      setOutputDir,
      setInitializing,
    });
  } catch (error) {
    void logger.error(`[startPlaylistDownload] Download failed for "${playlistTitle}": ${String(error)}`);
  }
}
