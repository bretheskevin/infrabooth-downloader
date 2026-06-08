import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshButton } from '@/components/ui/refresh-button';
import type { TrackInfo } from '@/bindings';
import { TrackListView } from '@/components/track-list/TrackListView';
import { libraryActions, useLibraryStore } from '../store';
import { useLikedTracks } from '../hooks/useLikedTracks';

interface TracksTabContentProps {
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function TracksTabContent({ onDownloadTracks }: TracksTabContentProps) {
  const { t } = useTranslation();

  const { tracks, isLoading, isStreaming, error, refetch, clearCache } = useLikedTracks(true);

  const handleRefresh = useCallback(async () => {
    await clearCache();
    await refetch();
  }, [clearCache, refetch]);

  const initialScrollOffset = useLibraryStore.getState().tracksScrollTop;
  const saveScrollOffset = useCallback((offset: number) => {
    libraryActions().setTracksScrollTop(offset);
  }, []);

  return (
    <TrackListView
      query={{ tracks: isLoading ? undefined : tracks, isStreaming, isLoading, error, onRetry: refetch }}
      source={{ title: t('library.tracks.title') }}
      resetKey="liked-tracks"
      header={({ actions }) => (
        <div className="flex items-center justify-between pb-2">
          <div>
            <h2 className="text-lg font-semibold">{t('library.tracks.title')}</h2>
            {!isLoading && <p className="text-sm text-muted-foreground">{t('download.trackCount', { count: tracks.length })}</p>}
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton
              onRefresh={handleRefresh}
              aria-label={t('library.refresh')}
              className="h-8 w-8 text-muted-foreground"
              iconClassName="h-3.5 w-3.5"
            />
            {actions}
          </div>
        </div>
      )}
      download={{
        onDownloadTracks,
      }}
      trackList={{
        virtualized: true,
        initialScrollOffset,
        onScrollOffsetChange: saveScrollOffset,
        searchPlaceholder: t('library.tracks.searchPlaceholder'),
      }}
      messages={{
        empty: 'library.tracks.empty',
        noResults: 'library.tracks.emptyFiltered',
        error: 'library.tracks.errorLoading',
      }}
    />
  );
}
