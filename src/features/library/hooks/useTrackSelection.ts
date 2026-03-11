import { useState, useCallback, useMemo } from 'react';
import type { TrackInfo } from '@/bindings';

export function useTrackSelection(visibleTracks: TrackInfo[]) {
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
      const allVisible = visibleTracks.every((t) => prev.has(t.id));
      if (allVisible) {
        const next = new Set(prev);
        for (const t of visibleTracks) {
          next.delete(t.id);
        }
        return next;
      }
      const next = new Set(prev);
      for (const t of visibleTracks) {
        next.add(t.id);
      }
      return next;
    });
  }, [visibleTracks]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedTracks = useMemo(
    () => visibleTracks.filter((t) => selectedIds.has(t.id)),
    [visibleTracks, selectedIds],
  );

  const selectedCount = selectedTracks.length;

  const isAllSelected = useMemo(
    () => visibleTracks.length > 0 && visibleTracks.every((t) => selectedIds.has(t.id)),
    [visibleTracks, selectedIds],
  );

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
