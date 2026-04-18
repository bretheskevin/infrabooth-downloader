import { useState, useCallback } from 'react';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { TrackListView } from '@/components/track-list/TrackListView';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import { useRemoveFromPlaylist } from '../hooks/useRemoveFromPlaylist';
import { useLibraryStore } from '../store';
import { PlaylistDetailHeader } from './PlaylistDetailHeader';
import { RemoveFromPlaylistDialog } from './RemoveFromPlaylistDialog';

interface PlaylistDetailViewProps {
  playlist: LibraryPlaylist;
  initialTracks?: TrackInfo[];
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function PlaylistDetailView({ playlist, initialTracks, onBack, onDownloadTracks }: PlaylistDetailViewProps) {
  const { data: tracks, isLoading, isStreaming, error, refetch } = usePlaylistTracks(playlist.id, initialTracks);

  const needsArtwork = !playlist.artwork_url && !initialTracks;
  const { data: resolvedArtwork } = usePlaylistArtwork(playlist.id, playlist.secret_token, needsArtwork);
  const artworkUrl = playlist.artwork_url ?? resolvedArtwork ?? null;

  const [trackToRemove, setTrackToRemove] = useState<TrackInfo | null>(null);
  const { removeFromPlaylist, removingFromPlaylistId } = useRemoveFromPlaylist(() => {
    setTrackToRemove(null);
  });

  const initialScrollOffset = useLibraryStore.getState().detailScrollTop;
  const saveScrollOffset = useCallback((offset: number) => {
    useLibraryStore.getState().setDetailScrollTop(offset);
  }, []);

  return (
    <>
      <TrackListView
        tracks={tracks}
        isLoading={isLoading}
        isStreaming={isStreaming}
        error={error}
        onRetry={refetch}
        title={playlist.title}
        resetKey={playlist.id}
        header={({ actions, folderMetadata }) => (
          <PlaylistDetailHeader
            playlist={playlist}
            artworkUrl={artworkUrl}
            trackCount={tracks?.length ?? playlist.track_count}
            onBack={onBack}
            folderMetadata={folderMetadata}
            actions={actions}
          />
        )}
        folder
        download={{ onDownloadTracks }}
        trackList={{
          virtualized: true,
          onRemoveFromPlaylist: playlist.is_owned ? setTrackToRemove : undefined,
          initialScrollOffset,
          onScrollOffsetChange: saveScrollOffset,
        }}
        messages={{
          empty: 'library.detail.emptyPlaylist',
          error: 'library.detail.errorLoading',
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
