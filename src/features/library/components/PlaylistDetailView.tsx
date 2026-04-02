import { useState, useMemo, useCallback, useEffect } from 'react';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { DetailViewLayout } from '@/components/detail-view/DetailViewLayout';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import { useRemoveFromPlaylist } from '../hooks/useRemoveFromPlaylist';
import { useLibraryStore } from '../store';
import { sortTracks } from '../utils/sortTracks';
import { getErrorMessageKey } from '@/lib/getErrorMessageKey';
import { PlaylistDetailHeader } from './PlaylistDetailHeader';
import { RemoveFromPlaylistDialog } from './RemoveFromPlaylistDialog';
import type { SortField } from '../types';
import type { SortDirection } from '@/lib/sort';

const PLAYLIST_SORT_OPTIONS = [
  { key: 'default', label: 'library.detail.sortDefault' },
  { key: 'title', label: 'library.detail.sortTitle' },
  { key: 'artist', label: 'library.detail.sortArtist' },
] as const satisfies readonly { key: SortField; label: string }[];

interface PlaylistDetailViewProps {
  playlist: LibraryPlaylist;
  initialTracks?: TrackInfo[];
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function PlaylistDetailView({ playlist, initialTracks, onBack, onDownloadTracks }: PlaylistDetailViewProps) {
  const { data: tracks, isLoading, isStreaming, error, refetch } = usePlaylistTracks(playlist.id, initialTracks);

  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    setSortField('default');
    setSortDirection('asc');
  }, [playlist.id]);

  const sortedTracks = useMemo(
    () => (tracks ? sortTracks(tracks, sortField, sortDirection) : []),
    [tracks, sortField, sortDirection],
  );

  const needsArtwork = !playlist.artwork_url && !initialTracks;
  const { data: resolvedArtwork } = usePlaylistArtwork(playlist.id, playlist.secret_token, needsArtwork);
  const artworkUrl = playlist.artwork_url ?? resolvedArtwork ?? null;

  const [trackToRemove, setTrackToRemove] = useState<TrackInfo | null>(null);
  const { removeFromPlaylist, removingFromPlaylistId } = useRemoveFromPlaylist(() => {
    setTrackToRemove(null);
  });

  const errorMessageKey = useMemo(
    () => (error ? getErrorMessageKey(error, 'library.detail.errorLoading') : undefined),
    [error],
  );

  const initialScrollOffset = useLibraryStore.getState().detailScrollTop;
  const saveScrollOffset = useCallback((offset: number) => {
    useLibraryStore.getState().setDetailScrollTop(offset);
  }, []);

  return (
    <>
      <DetailViewLayout
        tracks={sortedTracks}
        isLoading={isLoading}
        isStreaming={isStreaming}
        error={error}
        onRetry={refetch}
        title={playlist.title}
        resetKey={playlist.id}
        header={({ downloadedCount, downloadAllAction, folder }) => (
          <PlaylistDetailHeader
            playlist={playlist}
            artworkUrl={artworkUrl}
            trackCount={tracks?.length ?? playlist.track_count}
            onBack={onBack}
            downloadedCount={downloadedCount}
            folderName={folder.folderName}
            isCustomFolder={folder.isCustomFolder}
            onChangeFolder={folder.handleChangeFolder}
            onOpenFolder={folder.handleOpenFolder}
            showOrderToggle={(tracks?.length ?? 0) > 1}
            actions={downloadAllAction}
          />
        )}
        folder
        download={{ onDownloadTracks }}
        sort={{
          options: PLAYLIST_SORT_OPTIONS,
          active: sortField,
          onChange: setSortField,
          direction: sortDirection,
          onDirectionChange: setSortDirection,
          variant: 'select',
        }}
        trackList={{
          virtualized: true,
          searchThreshold: 5,
          onRemoveFromPlaylist: playlist.is_owned ? setTrackToRemove : undefined,
          initialScrollOffset,
          onScrollOffsetChange: saveScrollOffset,
        }}
        messages={{
          empty: 'library.detail.emptyPlaylist',
          error: errorMessageKey,
        }}
      />

      <RemoveFromPlaylistDialog
        open={trackToRemove !== null}
        trackTitle={trackToRemove?.title ?? ''}
        playlistTitle={playlist.title}
        isRemoving={removingFromPlaylistId === playlist.id}
        onConfirm={() => {
          if (trackToRemove) {
            void removeFromPlaylist(playlist.id, playlist.title, trackToRemove.id);
          }
        }}
        onCancel={() => setTrackToRemove(null)}
      />
    </>
  );
}
