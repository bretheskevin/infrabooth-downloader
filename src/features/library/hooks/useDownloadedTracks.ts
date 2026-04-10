import { useEffect, useState } from 'react';
import { commands, type TrackInfo } from '@/bindings';
import { logger } from '@/lib/logger';
import { seedFilePath } from '@/hooks/useDownloadState';

const EMPTY_SET = new Set<number>();

export function useDownloadedTracks(
  tracks: TrackInfo[] | undefined,
  downloadPath: string | undefined,
  enabled: boolean = true,
  refreshKey: number = 0,
) {
  const [downloadedIds, setDownloadedIds] = useState<Set<number>>(EMPTY_SET);

  useEffect(() => {
    const trackIds = tracks?.map((t) => String(t.id)) ?? [];

    if (!enabled || !downloadPath || trackIds.length === 0) {
      setDownloadedIds(EMPTY_SET);
      return;
    }

    let cancelled = false;

    commands
      .scanExistingTracks(downloadPath, trackIds)
      .then((found) => {
        if (!cancelled) {
          const ids: number[] = [];
          for (const [trackId, filePath] of Object.entries(found)) {
            const num = Number(trackId);
            if (!Number.isNaN(num)) {
              ids.push(num);
              if (filePath) seedFilePath(String(num), filePath);
            }
          }
          setDownloadedIds(new Set(ids));
        }
      })
      .catch((err: unknown) => {
        logger.error(`[useDownloadedTracks] Scan failed: ${err}`);
        if (!cancelled) setDownloadedIds(EMPTY_SET);
      });

    return () => {
      cancelled = true;
    };
  }, [downloadPath, tracks, enabled, refreshKey]);

  return {
    downloadedIds,
    downloadedCount: downloadedIds.size,
  };
}
