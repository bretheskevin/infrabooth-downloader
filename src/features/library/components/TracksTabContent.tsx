import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackInfo } from '@/bindings';
import { TrackListView } from '@/components/track-list/TrackListView';
import { libraryActions, useLibraryStore } from '../store';
import { useLikedTracks } from '../hooks/useLikedTracks';

interface TracksTabContentProps {
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function TracksTabContent({ onDownloadTracks }: TracksTabContentProps) {
  const { t } = useTranslation();

  const { tracks, isLoading, isStreaming, error, refetch } = useLikedTracks(true);

  const initialScrollOffset = useLibraryStore.getState().tracksScrollTop;
  const saveScrollOffset = useCallback((offset: number) => {
    libraryActions().setTracksScrollTop(offset);
  }, []);

  return (
    <TrackListView
      tracks={isLoading ? undefined : tracks}
      isStreaming={isStreaming}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title={t('library.tracks.title')}
      resetKey="liked-tracks"
      header={({ actions }) => (
        <div className="flex items-center justify-between pb-2">
          <div>
            <h2 className="text-lg font-semibold">{t('library.tracks.title')}</h2>
            {!isLoading && <p className="text-sm text-muted-foreground">{t('download.trackCount', { count: tracks.length })}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
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
