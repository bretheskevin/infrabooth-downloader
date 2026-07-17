import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { cn, noop } from '@/lib/utils';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { EXPANDED_BAR_HEIGHT } from './ExpandedBar';
import { QueuePanelItem } from './QueuePanelItem';
import { useQueueInteraction } from '../hooks/useQueueInteraction';

export function QueuePanel({ closing }: { closing?: boolean }) {
  const { t } = useTranslation();
  const {
    queue,
    cursor,
    playerState,
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
  } = useQueueInteraction();

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.08)] duration-250 max-h-[60vh] flex flex-col',
        closing ? 'animate-out slide-out-to-bottom fill-mode-forwards' : 'animate-in slide-in-from-bottom',
      )}
      style={{ bottom: `${EXPANDED_BAR_HEIGHT}px` }}
    >
      <div className="px-4 py-2 border-b border-border/50">
        <h3 className="text-xs font-semibold">{t('player.queue')}</h3>
        <p className="text-[10px] text-muted-foreground">{t('player.queueCount', { count: queue.length })}</p>
      </div>
      {queue.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{t('player.queueEmpty')}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <VirtualListContainer parentRef={parentRef} totalSize={totalSize} className="flex-1 min-h-0 py-1">
              {virtualItems.map((virtualItem) => {
                const item = queue[virtualItem.index];
                if (!item) return null;
                const index = virtualItem.index;
                return (
                  <VirtualRow key={item.uid} size={virtualItem.size} start={virtualItem.start}>
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
