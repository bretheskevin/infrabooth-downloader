import type { TrackInfo } from '@/bindings';
import { useTrackDownload } from './useTrackDownload';
import { useMergedTrackState } from './useMergedTrackState';
import { useDownloadedTracks } from '@/features/library/hooks/useDownloadedTracks';

interface UseTrackDownloadStateParams {
  tracks: TrackInfo[] | undefined;
  downloadPath: string;
  enabled: boolean;
  extraRefreshKey?: number;
}

export function useTrackDownloadState({ tracks, downloadPath, enabled, extraRefreshKey = 0 }: UseTrackDownloadStateParams) {
  const {
    downloadTrack,
    getTrackState: getRawTrackState,
    completedCount: inlineCompletedCount,
    reconcile,
  } = useTrackDownload(downloadPath);

  const { downloadedIds, downloadedCount } = useDownloadedTracks(tracks, downloadPath, enabled, inlineCompletedCount + extraRefreshKey);

  const getTrackState = useMergedTrackState(getRawTrackState, downloadedIds, reconcile);

  return {
    downloadTrack,
    getTrackState,
    downloadedIds,
    downloadedCount,
    inlineCompletedCount,
    reconcile,
  };
}
