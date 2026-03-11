import { useState, useCallback, useMemo } from 'react';
import type { TrackInfo } from '@/bindings';

export function useTrackSelection(tracks: TrackInfo[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleTrack = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = tracks.every((t) => prev.has(t.id));
      return allSelected ? new Set() : new Set(tracks.map((t) => t.id));
    });
  }, [tracks]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedTracks = useMemo(
    () => tracks.filter((t) => selectedIds.has(t.id)),
    [tracks, selectedIds],
  );

  const selectedCount = selectedTracks.length;
  const isAllSelected = tracks.length > 0 && selectedCount === tracks.length;

  return {
    selectedIds,
    toggleTrack,
    toggleAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    selectedTracks,
  };
}
