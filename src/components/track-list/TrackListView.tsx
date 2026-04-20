import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackListProvider } from '@/components/InteractiveTrackRow';
import { SelectionActionBar } from '@/components/SelectionActionBar';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/FilterChips';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { sortTracks, TRACK_SORT_OPTIONS, type SortField, type SortDirection } from '@/lib/sort';
import { getErrorMessageKey } from '@/lib/getErrorMessageKey';
import { FolderMetadata } from '@/components/FolderMetadata';
import { PreserveOrderToggle } from '@/components/PreserveOrderToggle';
import { TrackListActionsDropdown } from '@/features/rekordbox-export/components/TrackListActionsDropdown';
import { useTrackListState } from './hooks/useTrackListState';
import { TrackListToolbar } from './TrackListToolbar';
import { TrackListItems } from './TrackListItems';
import type { TrackListViewProps, TrackListRenderContext } from './types';

const DEFAULT_SEARCH_THRESHOLD = 5;

export function TrackListView<F extends string = string>({
  tracks,
  isLoading,
  isStreaming,
  error,
  onRetry,
  title,
  header,
  download,
  folder,
  trackList,
  filters,
  permalinkUrl,
  messages,
  resetKey,
}: TrackListViewProps<F>) {
  const { t } = useTranslation();

  const [sortState, setSortState] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'default',
    direction: 'asc',
  });
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setSortState({ field: 'default', direction: 'asc' });
  }

  const sortedTracks = useMemo(
    () => (tracks ? sortTracks(tracks, sortState.field, sortState.direction) : undefined),
    [tracks, sortState.field, sortState.direction],
  );

  const state = useTrackListState({
    tracks: sortedTracks,
    isLoading,
    isStreaming,
    title,
    download,
    folder,
    searchThreshold: DEFAULT_SEARCH_THRESHOLD,
    resetKey,
  });

  const fallbackErrorKey = messages.error ?? 'common.error';
  const resolvedErrorKey = useMemo(
    () => (error ? getErrorMessageKey(error, fallbackErrorKey) : fallbackErrorKey),
    [error, fallbackErrorKey],
  );

  const itemHeight = trackList?.itemHeight ?? 56;
  const hasData = tracks && tracks.length > 0;
  const hasMultipleTracks = (tracks?.length ?? 0) > 1;
  const showFilters = !!filters && !isLoading;
  const showContent = !isLoading && state.displayTracks.length > 0;
  const showEmptyNoData = !isLoading && !error && tracks && tracks.length === 0;
  const showEmptyFiltered = !isLoading && !error && hasData && state.displayTracks.length === 0;

  const canDownload = state.isDownloadEnabled && !!(hasData && !isLoading);
  const canShuffle = !!(hasData && !isLoading && hasMultipleTracks);
  const showOrderToggle = canDownload && hasMultipleTracks;
  const downloadAllAction = canDownload ? (
    <div className="flex items-center gap-2 shrink-0">
      {showOrderToggle && <PreserveOrderToggle variant="icon" />}
      <Button size="sm" onClick={state.handleDownloadAll} className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        {t('common.downloadAll')}
      </Button>
    </div>
  ) : null;

  const rekordboxExportAction = hasData && !isLoading ? (
    <TrackListActionsDropdown tracks={tracks} playlistName={title} permalinkUrl={permalinkUrl} />
  ) : null;

  const renderCtx: TrackListRenderContext = {
    actions: <>{rekordboxExportAction}{downloadAllAction}</>,
    folderMetadata: (
      <FolderMetadata
        folderName={state.folder.folderName}
        isCustomFolder={state.folder.isCustomFolder}
        downloadedCount={state.downloadedCount}
        isDownloadEnabled={state.isDownloadEnabled}
        onChangeFolder={state.folder.handleChangeFolder}
        onOpenFolder={state.folder.handleOpenFolder}
      />
    ),
  };
  const headerNode = typeof header === 'function' ? header(renderCtx) : header;

  const onSortFieldChange = useCallback(
    (field: SortField) => setSortState((s) => ({ ...s, field })),
    [],
  );
  const onSortDirectionChange = useCallback(
    (direction: SortDirection) => setSortState((s) => ({ ...s, direction })),
    [],
  );
  const sortConfig = useMemo(
    () => ({
      options: TRACK_SORT_OPTIONS,
      active: sortState.field,
      onChange: onSortFieldChange,
      direction: sortState.direction,
      onDirectionChange: onSortDirectionChange,
    }),
    [sortState.field, sortState.direction, onSortFieldChange, onSortDirectionChange],
  );

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {headerNode}

      {showFilters && (
        <div className="px-3">
          <FilterChips
            options={filters.options}
            active={filters.active}
            onChange={filters.onChange}
          />
        </div>
      )}

      {state.showSearch && (
        <SearchBar
          value={state.searchQuery}
          onChange={state.setSearchQuery}
          placeholder={t(trackList?.searchPlaceholder ?? 'common.filterPlaceholder')}
        />
      )}

      {isLoading && <TrackRowSkeletonList />}

      {error && !isLoading && onRetry && !hasData && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-muted-foreground">{t(resolvedErrorKey)}</p>
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {error && !isLoading && onRetry && hasData && (
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-destructive/80 bg-destructive/10 rounded mx-3">
          <span>{t(resolvedErrorKey)}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {showEmptyNoData && (
        <p className="text-sm text-muted-foreground text-center py-12">{t(messages.empty)}</p>
      )}

      {showEmptyFiltered && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t(messages.noResults ?? 'common.noResults')}
        </p>
      )}

      {showContent && (
        <>
          <TrackListToolbar
            isDownloadEnabled={state.isDownloadEnabled}
            hasSelectableTracks={state.selectableCount > 0}
            isAllSelected={state.isAllSelected}
            onToggleAll={state.toggleAll}
            sort={hasMultipleTracks ? sortConfig : undefined}
            onPlayShuffled={canShuffle ? state.playShuffled : undefined}
          />

          <TrackListProvider
            playTrack={state.playTrack}
            downloadTrack={state.downloadTrack}
            isDownloadEnabled={state.isDownloadEnabled}
            downloadedIds={state.downloadedIds}
            selection={{ selectedIds: state.selectedIds, toggleTrack: state.toggleTrack }}
            animate={state.shouldAnimate}
          >
            <TrackListItems
              tracks={state.displayTracks}
              virtualized={trackList?.virtualized ?? true}
              itemHeight={trackList?.itemHeight ?? 56}
              subtitleSlot={trackList?.subtitleSlot}
              onRemoveFromPlaylist={trackList?.onRemoveFromPlaylist}
              initialScrollOffset={trackList?.initialScrollOffset}
              onScrollOffsetChange={trackList?.onScrollOffsetChange}
            />
          </TrackListProvider>

          {isStreaming && state.displayTracks.length * itemHeight < 600 && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t('common.loadingTracks')}</span>
            </div>
          )}

          <SelectionActionBar
            selectedCount={state.selectedCount}
            onDownload={state.handleDownloadSelected}
          />
        </>
      )}
    </div>
  );
}
