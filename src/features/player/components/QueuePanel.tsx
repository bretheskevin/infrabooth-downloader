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
import { EXPANDED_BAR_HEIGHT } from './ExpandedBar';
import { usePlayerStore } from '../store';
import { QueuePanelItem } from './QueuePanelItem';

const actions = () => usePlayerStore.getState();

export function QueuePanel() {
  const { t } = useTranslation();
  const { queue, cursor, playerState } = usePlayerStore(
    useShallow((s) => ({
      queue: s.queue,
      cursor: s.cursor,
      playerState: s.state,
    }))
  );

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
      className="fixed left-0 right-0 z-40 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-250 max-h-[60vh] flex flex-col"
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
                {queue.map((item, index) => (
                  <QueuePanelItem
                    key={item.trackId}
                    item={item}
                    index={index}
                    isCurrent={index === cursor}
                    onPlay={(i) => actions().play(queue, i)}
                    onPause={() => actions().pause()}
                    onResume={() => actions().resume()}
                    onRemove={(i) => actions().removeFromQueue(i)}
                    isPlayerPlaying={playerState === 'playing'}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
