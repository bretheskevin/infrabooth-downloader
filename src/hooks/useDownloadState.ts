import { useCallback, useState } from 'react';
import type { DownloadProgressEvent, ErrorResponse } from '@/bindings';

interface TrackDownloadState {
  status: string;
  percent?: number;
  error?: ErrorResponse | null;
}

interface DownloadStateMap {
  map: Map<string, TrackDownloadState>;
  completedCount: number;
}

export function useDownloadState() {
  const [state, setState] = useState<DownloadStateMap>({
    map: new Map(),
    completedCount: 0,
  });

  const updateFromEvent = useCallback((event: DownloadProgressEvent) => {
    setState((prev) => {
      const newMap = new Map(prev.map);
      const existing = newMap.get(event.trackId);

      newMap.set(event.trackId, {
        status: event.status,
        percent: event.percent ?? existing?.percent,
        error: event.error,
      });

      const newCompleted =
        event.status === 'completed' && existing?.status !== 'completed'
          ? prev.completedCount + 1
          : prev.completedCount;

      return { map: newMap, completedCount: newCompleted };
    });
  }, []);

  const getTrackState = useCallback(
    (trackId: string) => state.map.get(trackId),
    [state.map]
  );

  const reconcile = useCallback((trackIds: string[]) => {
    setState((prev) => {
      const newMap = new Map<string, TrackDownloadState>();
      for (const id of trackIds) {
        const existing = prev.map.get(id);
        if (existing) newMap.set(id, existing);
      }
      return { ...prev, map: newMap };
    });
  }, []);

  return { completedCount: state.completedCount, updateFromEvent, getTrackState, reconcile };
}
