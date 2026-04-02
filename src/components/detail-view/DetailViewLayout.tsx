import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackListProvider } from '@/components/InteractiveTrackRow';
import { SelectionActionBar } from '@/components/SelectionActionBar';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/FilterChips';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { useDetailViewState } from './hooks/useDetailViewState';
import { DetailViewToolbar } from './DetailViewToolbar';
import { DetailViewTrackList } from './DetailViewTrackList';
import type { DetailViewLayoutProps, DetailViewRenderContext } from './types';

export function DetailViewLayout<S extends string = string, F extends string = string>({
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
  sort,
  messages,
  resetKey,
}: DetailViewLayoutProps<S, F>) {
  const { t } = useTranslation();

  const state = useDetailViewState({
    tracks,
    isLoading,
    isStreaming,
    title,
    download,
    folder,
    searchThreshold: trackList?.searchThreshold,
    resetKey,
  });

  const hasData = tracks && tracks.length > 0;
  const showFilters = !!filters && !isLoading;
  const showContent = !isLoading && state.displayTracks.length > 0;
  const showEmptyNoData = !isLoading && !error && tracks && tracks.length === 0;
  const showEmptyFiltered = !isLoading && !error && hasData && state.displayTracks.length === 0;

  const canDownload = state.isDownloadEnabled && !!(hasData && !isLoading);
  const downloadAllAction = canDownload ? (
    <Button size="sm" onClick={state.handleDownloadAll} className="gap-1.5 shrink-0">
      <Download className="h-3.5 w-3.5" />
      {t('common.downloadAll')}
    </Button>
  ) : null;

  const renderCtx: DetailViewRenderContext = {
    trackCount: tracks?.length ?? 0,
    downloadedCount: state.downloadedCount,
    downloadAllAction,
    isDownloadEnabled: state.isDownloadEnabled,
    folder: state.folder,
  };
  const headerNode = typeof header === 'function' ? header(renderCtx) : header;

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
          <p className="text-sm text-muted-foreground">{t(messages.error ?? 'common.error')}</p>
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {error && !isLoading && onRetry && hasData && (
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-destructive/80 bg-destructive/10 rounded mx-3">
          <span>{t(messages.error ?? 'common.error')}</span>
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
          <DetailViewToolbar
            isDownloadEnabled={state.isDownloadEnabled}
            hasSelectableTracks={state.selectableCount > 0}
            isAllSelected={state.isAllSelected}
            onToggleAll={state.toggleAll}
            sort={sort}
            isStreaming={isStreaming}
          />

          <TrackListProvider
            playTrack={state.playTrack}
            downloadTrack={state.downloadTrack}
            isDownloadEnabled={state.isDownloadEnabled}
            downloadedIds={state.downloadedIds}
            selection={{ selectedIds: state.selectedIds, toggleTrack: state.toggleTrack }}
            animate={state.shouldAnimate}
          >
            <DetailViewTrackList
              tracks={state.displayTracks}
              virtualized={trackList?.virtualized ?? true}
              itemHeight={trackList?.itemHeight ?? 56}
              subtitleSlot={trackList?.subtitleSlot}
              onRemoveFromPlaylist={trackList?.onRemoveFromPlaylist}
              initialScrollOffset={trackList?.initialScrollOffset}
              onScrollOffsetChange={trackList?.onScrollOffsetChange}
            />
          </TrackListProvider>

          {isStreaming && (
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
