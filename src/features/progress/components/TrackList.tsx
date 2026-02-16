import { useQueueStore } from '@/features/queue/store';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { TrackCard } from './TrackCard';

const TRACK_CARD_HEIGHT = 72;

export function TrackList() {
  const { t } = useTranslation();

  const { tracks, currentIndex, isInitializing } = useQueueStore(
    useShallow((state) => ({
      tracks: state.tracks,
      currentIndex: state.currentIndex,
      isInitializing: state.isInitializing,
    }))
  );

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: tracks.length,
    itemHeight: TRACK_CARD_HEIGHT,
  });

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        {t('progress.trackList.emptyState')}
      </div>
    );
  }

  return (
    <VirtualListContainer
      parentRef={parentRef}
      totalSize={totalSize}
      ariaLabel={t('progress.trackList.ariaLabel', 'Download queue')}
    >
      {virtualItems.map((virtualItem) => {
        const track = tracks[virtualItem.index];
        if (!track) return null;
        return (
          <VirtualRow key={track.id} virtualItem={virtualItem} className="px-2">
            <TrackCard
              track={track}
              isCurrentTrack={virtualItem.index === currentIndex}
              isInitializing={isInitializing && virtualItem.index === 0}
            />
          </VirtualRow>
        );
      })}
    </VirtualListContainer>
  );
}
