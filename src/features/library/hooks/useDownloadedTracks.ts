import { useEffect, useRef, useState } from 'react';
import { commands, type TrackInfo } from '@/bindings';
import { logger } from '@/lib/logger';

const EMPTY_SET = new Set<number>();

export function useDownloadedTracks(
  tracks: TrackInfo[] | undefined,
  downloadPath: string | undefined,
  enabled: boolean = true,
) {
  const [downloadedIds, setDownloadedIds] = useState<Set<number>>(EMPTY_SET);

  // Stable trackIds: only recompute when the actual IDs change, not on every array reference
  const trackIds = tracks?.map((t) => String(t.id)) ?? [];
  const trackIdsKey = trackIds.join(',');
  const trackIdsRef = useRef(trackIds);
  if (trackIdsRef.current.join(',') !== trackIdsKey) {
    trackIdsRef.current = trackIds;
  }
  const stableTrackIds = trackIdsRef.current;

  useEffect(() => {
    if (!enabled || !downloadPath || stableTrackIds.length === 0) {
      setDownloadedIds(EMPTY_SET);
      return;
    }

    let cancelled = false;

    commands
      .scanExistingTracks(downloadPath, stableTrackIds)
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
  }, [downloadPath, stableTrackIds, enabled]);

  return {
    downloadedIds,
    downloadedCount: downloadedIds.size,
  };
}
