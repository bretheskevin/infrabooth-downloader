import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { EXPANDED_BAR_HEIGHT } from './ExpandedBar';
import { usePlayerStore } from '../store';
import { QueuePanelItem } from './QueuePanelItem';

const actions = () => usePlayerStore.getState();
const ITEM_HEIGHT = 44;
const noop = () => {};

export function QueuePanel({ closing }: { closing?: boolean }) {
  const { t } = useTranslation();
  const { queue, cursor, playerState, manualQueueCount, stationQueueCount } = usePlayerStore(
    useShallow((s) => ({
      queue: s.queue,
      cursor: s.cursor,
      playerState: s.state,
      manualQueueCount: s.manualQueueCount,
      stationQueueCount: s.stationQueueCount,
    }))
  );

  const [activeId, setActiveId] = useState<number | null>(null);
  const stationStartIdx = stationQueueCount > 0 ? queue.length - stationQueueCount : -1;

  const itemIds = useMemo(() => queue.map((i) => i.trackId), [queue]);

  const getSectionHeader = (index: number): string | undefined => {
    const isManualStart = manualQueueCount > 0 && index === cursor + 1;
    const showAutoHeader = manualQueueCount > 0 && index === cursor + 1 + manualQueueCount;
    const isStationStart = index === stationStartIdx;

    if (isManualStart) return t('player.nextUp');
    if (isStationStart) return t('player.stationSection');
    if (showAutoHeader && !isStationStart) return t('player.queueSection');
    return undefined;
  };

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: queue.length,
    itemHeight: ITEM_HEIGHT,
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-40 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.08)] duration-250 max-h-[60vh] flex flex-col",
        closing
          ? "animate-out slide-out-to-bottom fill-mode-forwards"
          : "animate-in slide-in-from-bottom"
      )}
      style={{ bottom: `${EXPANDED_BAR_HEIGHT}px` }}
    >
      <div className="px-4 py-2 border-b border-border/50">
        <h3 className="text-xs font-semibold">{t('player.queue')}</h3>
        <p className="text-[10px] text-muted-foreground">
          {t('player.queueCount', { count: queue.length })}
        </p>
      </div>
      {queue.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t('player.queueEmpty')}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <VirtualListContainer
              parentRef={parentRef}
              totalSize={totalSize}
              className="flex-1 min-h-0 py-1"
            >
              {virtualItems.map((virtualItem) => {
                const item = queue[virtualItem.index];
                if (!item) return null;
                const index = virtualItem.index;
                return (
                  <VirtualRow
                    key={item.trackId}
                    size={virtualItem.size}
                    start={virtualItem.start}
                  >
                    <QueuePanelItem
                      item={item}
                      index={index}
                      isCurrent={index === cursor}
                      onPlay={handlePlay}
                      onPause={handlePause}
                      onResume={handleResume}
                      onRemove={handleRemove}
                      isPlayerPlaying={playerState === 'playing'}
                      sectionHeader={getSectionHeader(index)}
                    />
                  </VirtualRow>
                );
              })}
            </VirtualListContainer>
          </SortableContext>
          <DragOverlay>
            {activeItem && (
              <QueuePanelItem
                item={activeItem}
                index={activeIndex}
                isCurrent={activeIndex === cursor}
                onPlay={noop}
                onPause={noop}
                onResume={noop}
                onRemove={noop}
                isPlayerPlaying={playerState === 'playing'}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
