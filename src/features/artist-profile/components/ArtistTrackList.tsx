import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectAllCheckbox } from '@/components/SelectAllCheckbox';
import { SortDirectionSelect } from '@/components/SortDirectionSelect';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { InteractiveTrackRow } from '@/components/InteractiveTrackRow';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import type { TrackInfo } from '@/bindings';
import type { SortOption } from '../types';
import type { SortDirection } from '@/lib/sort';

interface ArtistTrackListProps {
  tracks: TrackInfo[];
  isLoading: boolean;
  isStreaming: boolean;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  isAllSelected: boolean;
  onToggleAll: () => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
}

const TRACK_ITEM_HEIGHT = 56;

const SORT_OPTIONS: { key: SortOption; labelKey: string }[] = [
  { key: 'recent', labelKey: 'artistProfile.sortRecent' },
  { key: 'popular', labelKey: 'artistProfile.sortPopular' },
];

export function ArtistTrackList({
  tracks,
  isLoading,
  isStreaming,
  sort,
  onSortChange,
  isAllSelected,
  onToggleAll,
  sortDirection,
  onSortDirectionChange,
}: ArtistTrackListProps) {
  const { t } = useTranslation();

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: tracks.length,
    itemHeight: TRACK_ITEM_HEIGHT,
  });

  if (isLoading && tracks.length === 0) {
    return <TrackRowSkeletonList count={5} />;
  }

  if (!isLoading && !isStreaming && tracks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t('artistProfile.noTracks')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {SORT_OPTIONS.map(({ key, labelKey }) => (
            <Button
              key={key}
              variant={sort === key ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full px-3.5"
              onClick={() => onSortChange(key)}
            >
              {t(labelKey)}
            </Button>
          ))}
          {isStreaming && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <SortDirectionSelect value={sortDirection} onChange={onSortDirectionChange} />
      </div>

      <SelectAllCheckbox isAllSelected={isAllSelected && tracks.length > 0} onToggleAll={onToggleAll} className="px-3 py-1" />

      <VirtualListContainer parentRef={parentRef} totalSize={totalSize} className="flex-1 min-h-0 pr-2">
        {virtualItems.map((virtualItem) => {
          const track = tracks[virtualItem.index];
          if (!track) return null;
          return (
            <VirtualRow key={track.id} size={virtualItem.size} start={virtualItem.start}>
              <InteractiveTrackRow track={track} index={virtualItem.index} />
            </VirtualRow>
          );
        })}
      </VirtualListContainer>
    </div>
  );
}
