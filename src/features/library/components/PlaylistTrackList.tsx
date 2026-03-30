import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { SelectAllCheckbox } from '@/components/SelectAllCheckbox';
import { SortDirectionSelect } from '@/components/SortDirectionSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InteractiveTrackRow } from '@/components/InteractiveTrackRow';
import { useLibraryStore } from '../store';
import { SORT_FIELDS, type SortField } from '../types';
import type { SortDirection } from '@/lib/sort';

const TRACK_ITEM_HEIGHT = 56;

interface PlaylistTrackListProps {
  tracks: TrackInfo[];
  isStreaming?: boolean;
  isAllSelected: boolean;
  isDownloadEnabled: boolean;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortFieldChange?: (field: SortField) => void;
  onSortDirectionChange?: (direction: SortDirection) => void;
  onToggleAll: () => void;
  hasSelectableTracks?: boolean;
  onRemoveFromPlaylist?: (track: TrackInfo) => void;
}

export function PlaylistTrackList({
  tracks,
  isStreaming,
  isAllSelected,
  isDownloadEnabled,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  onToggleAll,
  hasSelectableTracks = true,
  onRemoveFromPlaylist,
}: PlaylistTrackListProps) {
  const { t } = useTranslation();

  const { parentRef, virtualItems, totalSize, getScrollOffset } = useVirtualizedList({
    count: tracks.length,
    itemHeight: TRACK_ITEM_HEIGHT,
    initialScrollOffset: useLibraryStore.getState().detailScrollTop,
  });

  useEffect(() => {
    return () => { useLibraryStore.getState().setDetailScrollTop(getScrollOffset()); };
  }, [getScrollOffset]);

  return (
    <>
      <div className="flex items-center justify-between px-3">
        {isDownloadEnabled && hasSelectableTracks && (
          <SelectAllCheckbox isAllSelected={isAllSelected} onToggleAll={onToggleAll} />
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onSortFieldChange && sortField && (
            <>
              <Select value={sortField} onValueChange={(v) => {
                if (SORT_FIELDS.includes(v as SortField)) onSortFieldChange(v as SortField);
              }}>
                <SelectTrigger className="h-7 text-xs w-auto gap-1.5 px-2">
                  <ArrowUpDown className="h-3 w-3 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t('library.detail.sortDefault')}</SelectItem>
                  <SelectItem value="title">{t('library.detail.sortTitle')}</SelectItem>
                  <SelectItem value="artist">{t('library.detail.sortArtist')}</SelectItem>
                </SelectContent>
              </Select>
              {onSortDirectionChange && sortDirection && (
                <SortDirectionSelect value={sortDirection} onChange={onSortDirectionChange} showIcon={false} />
              )}
            </>
          )}
        </div>
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
            <VirtualRow key={track.id} size={virtualItem.size} start={virtualItem.start}>
              <InteractiveTrackRow
                track={track}
                index={virtualItem.index}
                onRemoveFromPlaylist={onRemoveFromPlaylist ? () => onRemoveFromPlaylist(track) : undefined}
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
