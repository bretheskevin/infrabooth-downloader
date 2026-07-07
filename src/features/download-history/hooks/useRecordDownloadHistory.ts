import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQueryClient } from '@tanstack/react-query';
import { useQueueStore } from '@/features/queue/store';
import { categorizeError } from '@/features/completion/utils/groupFailuresByReason';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import type { DownloadHistoryEntry, DownloadHistoryTrack } from '@/bindings';

export function useRecordDownloadHistory() {
  const queryClient = useQueryClient();
  const recordedRef = useRef<string | null>(null);

  const { isComplete, isCancelled, tracks, outputDir, batchTitle, completedCount, failedCount } =
    useQueueStore(
      useShallow((s) => ({
        isComplete: s.isComplete,
        isCancelled: s.isCancelled,
        tracks: s.tracks,
        outputDir: s.outputDir,
        batchTitle: s.batchTitle,
        completedCount: s.completedCount,
        failedCount: s.failedCount,
      })),
    );

  useEffect(() => {
    if (!isComplete || tracks.length === 0) {
      recordedRef.current = null;
      return;
    }

    const batchKey = `${tracks.length}-${completedCount}-${failedCount}`;
    if (recordedRef.current === batchKey) return;
    recordedRef.current = batchKey;

    const isPlaylist = batchTitle != null || tracks.length > 1;
    const title = batchTitle ?? tracks[0]?.title ?? 'Unknown';
    const artworkUrl = tracks[0]?.artworkUrl ?? null;

    const historyTracks: DownloadHistoryTrack[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      status: t.status,
      reason: t.status === 'failed' && t.error ? categorizeError(t.error) : null,
    }));

    const entry: DownloadHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      kind: isPlaylist ? 'Playlist' : 'Track',
      artworkUrl,
      destDir: outputDir,
      okCount: completedCount,
      failedCount,
      cancelled: isCancelled,
      completedAt: Date.now(),
      tracks: historyTracks,
    };

    void api
      .appendDownloadHistoryEntry(entry)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['download-history'] });
        void logger.info(`[history] Recorded batch: ${title} (${tracks.length} tracks)`);
      })
      .catch((err) => {
        void logger.error(`[history] Failed to record batch: ${err}`);
      });
  }, [isComplete, isCancelled, tracks, outputDir, batchTitle, completedCount, failedCount, queryClient]);
}
