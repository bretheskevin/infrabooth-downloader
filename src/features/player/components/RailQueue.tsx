import { useTranslation } from "react-i18next";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { noop } from "@/lib/utils";
import { VirtualListContainer, VirtualRow } from "@/components/ui/virtual-list";
import { QueuePanelItem } from "./QueuePanelItem";
import { useQueueInteraction } from "../hooks/useQueueInteraction";

export function RailQueue() {
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold">{t("player.nextUp")}</h3>
          <p className="text-[10px] text-muted-foreground">
            {t("player.queueCount", { count: queue.length })}
          </p>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t("player.queueEmpty")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
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
                      isPlayerPlaying={playerState === "playing"}
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
                isPlayerPlaying={playerState === "playing"}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
