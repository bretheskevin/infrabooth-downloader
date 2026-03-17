import { useCallback, useEffect } from 'react';
import type { DownloadState } from '@/types/download';

/**
 * Merges in-session download state with filesystem scan results.
 * Calls `reconcile` when `downloadedIds` changes to clear stale 'completed'
 * entries that are no longer present on disk.
 */
export function useMergedTrackState(
  getRawTrackState: (trackId: number) => DownloadState,
  downloadedIds: Set<number>,
  reconcile: (diskIds: Set<number>) => void,
) {
  useEffect(() => {
    reconcile(downloadedIds);
  }, [downloadedIds, reconcile]);

  return useCallback(
    (trackId: number): DownloadState => {
      const state = getRawTrackState(trackId);
      if (state.status === 'idle' && downloadedIds.has(trackId)) {
        return { status: 'completed' };
      }
      return state;
    },
    [getRawTrackState, downloadedIds],
  );
}
