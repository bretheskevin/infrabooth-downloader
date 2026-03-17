import { useEffect, useState } from 'react';
import { commands, type TrackInfo } from '@/bindings';
import { logger } from '@/lib/logger';

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
      .then((found: string[]) => {
        if (!cancelled) {
          const ids = found.map(Number).filter((n) => !Number.isNaN(n));
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
