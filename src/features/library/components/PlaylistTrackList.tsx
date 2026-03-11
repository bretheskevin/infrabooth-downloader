import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { Checkbox } from '@/components/ui/checkbox';
import { PlaylistTrackItem } from './PlaylistTrackItem';

const TRACK_ITEM_HEIGHT = 56;

interface PlaylistTrackListProps {
  tracks: TrackInfo[];
  isStreaming?: boolean;
  selectedIds: Set<number>;
  isAllSelected: boolean;
  onToggleTrack: (id: number) => void;
  onToggleAll: () => void;
  onDownloadTrack: (track: TrackInfo) => void;
}

export function PlaylistTrackList({
  tracks,
  isStreaming,
  selectedIds,
  isAllSelected,
  onToggleTrack,
  onToggleAll,
  onDownloadTrack,
}: PlaylistTrackListProps) {
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
      <div className="flex items-center gap-3 px-3">
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={onToggleAll}
          className="shrink-0"
        />
        <span className="text-xs text-muted-foreground">
          {t('library.detail.selectAll')}
        </span>
      </div>
      <VirtualListContainer
        parentRef={parentRef}
        totalSize={totalSize}
        className="flex-1 min-h-0 pr-2"
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
                isSelected={selectedIds.has(track.id)}
                onToggle={() => onToggleTrack(track.id)}
                onDownload={() => onDownloadTrack(track)}
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
