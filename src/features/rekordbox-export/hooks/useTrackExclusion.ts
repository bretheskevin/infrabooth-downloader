import { useCallback } from 'react';
import { useTrackListContextOptional } from '@/components/track-list-context';
import { useExcludedTrackIds, useRekordboxExclusionStore } from '../store';

export function useTrackExclusion(trackId: number) {
  const ctx = useTrackListContextOptional();
  const playlistId = ctx?.playlistId;
  const excludedSet = useExcludedTrackIds(playlistId);
  const isExcluded = playlistId ? excludedSet.has(trackId) : false;

  const toggle = useCallback(() => {
    if (!playlistId) return;
    useRekordboxExclusionStore.getState().toggleExcluded(playlistId, trackId);
  }, [playlistId, trackId]);

  return {
    isExcluded,
    toggle: playlistId ? toggle : undefined,
  };
}
