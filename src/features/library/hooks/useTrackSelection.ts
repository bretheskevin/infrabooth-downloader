import { useState, useCallback, useMemo, useEffect } from 'react';
import type { TrackInfo } from '@/bindings';

export function useTrackSelection(visibleTracks: TrackInfo[], excludeIds?: Set<number>) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleTrack = useCallback((id: number) => {
    if (excludeIds?.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [excludeIds]);

  const selectableTracks = useMemo(
    () => excludeIds ? visibleTracks.filter((t) => !excludeIds.has(t.id)) : visibleTracks,
    [visibleTracks, excludeIds],
  );

  // Only keep the not downloaded tracks
  useEffect(() => {
    if (!excludeIds || excludeIds.size === 0) return;
    setSelectedIds((prev) => {
      const hasExcluded = [...prev].some((id) => excludeIds.has(id));
      if (!hasExcluded) return prev;
      return new Set([...prev].filter((id) => !excludeIds.has(id)));
    });
  }, [excludeIds]);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelectable = selectableTracks.every((t) => prev.has(t.id));
      if (allSelectable) {
        const next = new Set(prev);
        for (const t of selectableTracks) {
          next.delete(t.id);
        }
        return next;
      }
      const next = new Set(prev);
      for (const t of selectableTracks) {
        next.add(t.id);
      }
      return next;
    });
  }, [selectableTracks]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedTracks = useMemo(
    () => visibleTracks.filter((t) => selectedIds.has(t.id)),
    [visibleTracks, selectedIds],
  );

  const selectedCount = selectedTracks.length;

  const isAllSelected = useMemo(
    () => selectableTracks.length > 0 && selectableTracks.every((t) => selectedIds.has(t.id)),
    [selectableTracks, selectedIds],
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
