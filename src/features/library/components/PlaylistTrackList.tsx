import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { PlaylistTrackItem } from './PlaylistTrackItem';

const TRACK_ITEM_HEIGHT = 56;

interface PlaylistTrackListProps {
  tracks: TrackInfo[];
  isStreaming?: boolean;
}

export function PlaylistTrackList({ tracks, isStreaming }: PlaylistTrackListProps) {
  const { t } = useTranslation();
  const prevCountRef = useRef(0);
  const shouldAnimate = tracks.length > prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = tracks.length;
  });

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: tracks.length,
    itemHeight: TRACK_ITEM_HEIGHT,
  });

  return (
    <>
      <VirtualListContainer
        parentRef={parentRef}
        totalSize={totalSize}
        className="max-h-[400px] pr-2"
      >
        {virtualItems.map((virtualItem) => {
          const track = tracks[virtualItem.index];
          if (!track) return null;
          return (
            <VirtualRow key={track.id} virtualItem={virtualItem}>
              <PlaylistTrackItem
                track={track}
                index={virtualItem.index}
                staggerIndex={virtualItem.index}
                animate={shouldAnimate}
              />
            </VirtualRow>
          );
        })}
      </VirtualListContainer>
      {isStreaming && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t('library.detail.loadingTracks')}</span>
        </div>
      )}
    </>
  );
}
