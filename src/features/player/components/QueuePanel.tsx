import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { EXPANDED_BAR_HEIGHT } from './ExpandedBar';
import { usePlayerStore } from '../store';
import { QueuePanelItem } from './QueuePanelItem';

const actions = () => usePlayerStore.getState();
const sectionHeaderClass = 'px-3 pt-3 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider';

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

  const stationStartIdx = stationQueueCount > 0 ? queue.length - stationQueueCount : -1;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-current]');
    el?.scrollIntoView({ block: 'center' });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = queue.findIndex((item) => item.trackId === active.id);
    const toIndex = queue.findIndex((item) => item.trackId === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      actions().reorderQueue(fromIndex, toIndex);
    }
  };

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
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t('player.queueEmpty')}
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={queue.map((i) => i.trackId)} strategy={verticalListSortingStrategy}>
              <div className="py-1">
                {queue.map((item, index) => {
                  const isManualStart = manualQueueCount > 0 && index === cursor + 1;
                  const showAutoHeader = manualQueueCount > 0 && index === cursor + 1 + manualQueueCount;
                  const isStationStart = index === stationStartIdx;

                  return (
                    <div key={item.trackId}>
                      {isManualStart && (
                        <div className={sectionHeaderClass}>
                          {t('player.nextUp')}
                        </div>
                      )}
                      {showAutoHeader && !isStationStart && (
                        <div className={sectionHeaderClass}>
                          {t('player.queueSection')}
                        </div>
                      )}
                      {isStationStart && (
                        <div className={sectionHeaderClass}>
                          {t('player.stationSection')}
                        </div>
                      )}
                      <QueuePanelItem
                        item={item}
                        index={index}
                        isCurrent={index === cursor}
                        onPlay={(i) => void actions().skipTo(i)}
                        onPause={() => actions().pause()}
                        onResume={() => actions().resume()}
                        onRemove={(i) => actions().removeFromQueue(i)}
                        isPlayerPlaying={playerState === 'playing'}
                      />
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
