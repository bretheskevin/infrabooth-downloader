import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useShallow } from 'zustand/react/shallow';

import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { usePlayerStore } from '../store';

const actions = () => usePlayerStore.getState();
const ITEM_HEIGHT = 44;
const SECTION_HEADER_HEIGHT = 30;

export function useQueueInteraction() {
  const { t } = useTranslation();
  const { queue, cursor, playerState, manualQueueCount, stationQueueCount } = usePlayerStore(
    useShallow((s) => ({
      queue: s.queue,
      cursor: s.cursor,
      playerState: s.state,
      manualQueueCount: s.manualQueueCount,
      stationQueueCount: s.stationQueueCount,
    })),
  );

  const [activeId, setActiveId] = useState<number | null>(null);
  const stationStartIdx = stationQueueCount > 0 ? queue.length - stationQueueCount : -1;

  const itemIds = useMemo(() => queue.map((i) => i.trackId), [queue]);

  const hasSectionHeader = useCallback(
    (index: number): boolean => {
      if (manualQueueCount > 0 && index === cursor + 1) return true;
      if (index === stationStartIdx) return true;
      if (manualQueueCount > 0 && index === cursor + 1 + manualQueueCount && index !== stationStartIdx) return true;
      return false;
    },
    [manualQueueCount, cursor, stationStartIdx],
  );

  const getSectionHeader = (index: number): string | undefined => {
    const isManualStart = manualQueueCount > 0 && index === cursor + 1;
    const showAutoHeader = manualQueueCount > 0 && index === cursor + 1 + manualQueueCount;
    const isStationStart = index === stationStartIdx;

    if (isManualStart) return t('player.nextUp');
    if (isStationStart) return t('player.stationSection');
    if (showAutoHeader && !isStationStart) return t('player.queueSection');
    return undefined;
  };

  const estimateSize = useCallback(
    (index: number) => ITEM_HEIGHT + (hasSectionHeader(index) ? SECTION_HEADER_HEIGHT : 0),
    [hasSectionHeader],
  );

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: queue.length,
    itemHeight: estimateSize,
    overscan: 5,
  });

  useEffect(() => {
    if (cursor >= 0 && parentRef.current) {
      const scrollTop = cursor * ITEM_HEIGHT;
      parentRef.current.scrollTop = Math.max(0, scrollTop - 100);
    }
  }, [cursor, parentRef]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = queue.findIndex((item) => item.trackId === active.id);
    const toIndex = queue.findIndex((item) => item.trackId === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      actions().reorderQueue(fromIndex, toIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handlePlay = useCallback((i: number) => void actions().skipTo(i), []);
  const handlePause = useCallback(() => actions().pause(), []);
  const handleResume = useCallback(() => actions().resume(), []);
  const handleRemove = useCallback((i: number) => actions().removeFromQueue(i), []);

  const activeItem = activeId !== null ? queue.find((item) => item.trackId === activeId) : null;
  const activeIndex = activeId !== null ? queue.findIndex((item) => item.trackId === activeId) : -1;

  return {
    queue,
    cursor,
    playerState,
    activeId,
    activeItem,
    activeIndex,
    itemIds,
    sensors,
    parentRef,
    virtualItems,
    totalSize,
    getSectionHeader,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handlePlay,
    handlePause,
    handleResume,
    handleRemove,
  };
}
