import { useEffect } from 'react';
import type { TrackInfo } from '@/bindings';
import { cn } from '@/lib/utils';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { InteractiveTrackRow } from '@/components/InteractiveTrackRow';
import { useIsMiniPillVisible } from '@/features/player/hooks/useIsMiniPillVisible';

const MINI_PILL_BOTTOM_PADDING = 'pb-10';

interface TrackListItemsProps {
  tracks: TrackInfo[];
  virtualized: boolean;
  itemHeight: number;
  subtitleSlot?: (track: TrackInfo, index: number) => React.ReactNode;
  onRemoveFromPlaylist?: (track: TrackInfo) => void;
  initialScrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
}

export function TrackListItems({
  tracks,
  virtualized,
  itemHeight,
  subtitleSlot,
  onRemoveFromPlaylist,
  initialScrollOffset,
  onScrollOffsetChange,
}: TrackListItemsProps) {
  const miniPillVisible = useIsMiniPillVisible();

  if (virtualized) {
    return (
      <VirtualizedTrackList
        tracks={tracks}
        itemHeight={itemHeight}
        subtitleSlot={subtitleSlot}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
        initialScrollOffset={initialScrollOffset}
        onScrollOffsetChange={onScrollOffsetChange}
      />
    );
  }

  return (
    <div className={cn('flex flex-col gap-0.5 overflow-y-auto min-h-0', miniPillVisible && MINI_PILL_BOTTOM_PADDING)}>
      {tracks.map((track, index) => (
        <InteractiveTrackRow
          key={track.id}
          track={track}
          index={index}
          subtitleSlot={subtitleSlot?.(track, index)}
          onRemoveFromPlaylist={onRemoveFromPlaylist ? () => onRemoveFromPlaylist(track) : undefined}
        />
      ))}
    </div>
  );
}

function VirtualizedTrackList({
  tracks,
  itemHeight,
  subtitleSlot,
  onRemoveFromPlaylist,
  initialScrollOffset,
  onScrollOffsetChange,
}: Omit<TrackListItemsProps, 'virtualized'>) {
  const miniPillVisible = useIsMiniPillVisible();
  const { parentRef, virtualItems, totalSize, getScrollOffset } = useVirtualizedList({
    count: tracks.length,
    itemHeight,
    initialScrollOffset,
  });

  useEffect(() => {
    if (!onScrollOffsetChange) return;
    return () => {
      onScrollOffsetChange(getScrollOffset());
    };
  }, [getScrollOffset, onScrollOffsetChange]);

  return (
    <VirtualListContainer
      parentRef={parentRef}
      totalSize={totalSize}
      className={cn('flex-1 min-h-0 pr-2', miniPillVisible && MINI_PILL_BOTTOM_PADDING)}
    >
      {virtualItems.map((virtualItem) => {
        const track = tracks[virtualItem.index];
        if (!track) return null;
        return (
          <VirtualRow key={track.id} size={virtualItem.size} start={virtualItem.start}>
            <InteractiveTrackRow
              track={track}
              index={virtualItem.index}
              subtitleSlot={subtitleSlot?.(track, virtualItem.index)}
              onRemoveFromPlaylist={onRemoveFromPlaylist ? () => onRemoveFromPlaylist(track) : undefined}
            />
          </VirtualRow>
        );
      })}
    </VirtualListContainer>
  );
}
