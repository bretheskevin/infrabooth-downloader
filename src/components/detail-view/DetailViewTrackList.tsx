import { useEffect } from 'react';
import type { TrackInfo } from '@/bindings';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { InteractiveTrackRow } from '@/components/InteractiveTrackRow';

interface DetailViewTrackListProps {
  tracks: TrackInfo[];
  virtualized: boolean;
  itemHeight: number;
  subtitleSlot?: (track: TrackInfo, index: number) => React.ReactNode;
  onRemoveFromPlaylist?: (track: TrackInfo) => void;
  initialScrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
}

export function DetailViewTrackList({
  tracks,
  virtualized,
  itemHeight,
  subtitleSlot,
  onRemoveFromPlaylist,
  initialScrollOffset,
  onScrollOffsetChange,
}: DetailViewTrackListProps) {
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
    <div className="flex flex-col gap-0.5 overflow-y-auto min-h-0">
      {tracks.map((track, index) => (
        <InteractiveTrackRow
          key={track.id}
          track={track}
          index={index}
          subtitleSlot={subtitleSlot?.(track, index)}
          onRemoveFromPlaylist={
            onRemoveFromPlaylist ? () => onRemoveFromPlaylist(track) : undefined
          }
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
}: Omit<DetailViewTrackListProps, 'virtualized'>) {
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
      className="flex-1 min-h-0 pr-2"
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
              onRemoveFromPlaylist={
                onRemoveFromPlaylist ? () => onRemoveFromPlaylist(track) : undefined
              }
            />
          </VirtualRow>
        );
      })}
    </VirtualListContainer>
  );
}
