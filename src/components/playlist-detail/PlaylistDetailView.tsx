import { useState, useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import type { ShareTrackInfo } from '@/features/messages/store';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';
import { TrackListView } from '@/components/track-list/TrackListView';
import { usePlaylistArtwork } from '@/features/library/hooks/usePlaylistArtwork';
import { useRemoveFromPlaylist } from '@/features/library/hooks/useRemoveFromPlaylist';
import { PlaylistDetailHeader } from './PlaylistDetailHeader';
import { RemoveFromPlaylistDialog } from './RemoveFromPlaylistDialog';
import { usePlaylistTracks } from './usePlaylistTracks';
import type { PlaylistData } from './types';

interface PlaylistDetailViewProps {
  playlist: PlaylistData;
  initialTracks?: TrackInfo[];
  breadcrumbItems: BreadcrumbItem[];
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
  scrollPreservation?: {
    get: () => number;
    set: (offset: number) => void;
  };
}

export function PlaylistDetailView({
  playlist,
  initialTracks,
  breadcrumbItems,
  onDownloadTracks,
  scrollPreservation,
}: PlaylistDetailViewProps) {
  const { data: tracks, isLoading, isStreaming, error, refetch } = usePlaylistTracks(playlist.id, playlist.secretToken, initialTracks);

  const needsArtwork = !playlist.artworkUrl && !initialTracks;
  const { data: resolvedArtwork } = usePlaylistArtwork(playlist.id, playlist.secretToken, needsArtwork);
  const artworkUrl = playlist.artworkUrl ?? resolvedArtwork ?? null;

  const [trackToRemove, setTrackToRemove] = useState<TrackInfo | null>(null);
  const { removeFromPlaylist, removingFromPlaylistId } = useRemoveFromPlaylist(() => {
    setTrackToRemove(null);
  });

  const initialScrollOffset = scrollPreservation?.get() ?? 0;
  const saveScrollOffset = useCallback(
    (offset: number) => {
      scrollPreservation?.set(offset);
    },
    [scrollPreservation],
  );

  const shareInfo: ShareTrackInfo | undefined =
    playlist.permalinkUrl && playlist.username
      ? {
          trackId: playlist.id,
          title: playlist.title,
          artist: playlist.username,
          artworkUrl: playlist.artworkUrl,
          permalinkUrl: playlist.permalinkUrl,
        }
      : undefined;

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
        header={({ actions, folderMetadata, onPlayAll, onShuffle }) => (
          <PlaylistDetailHeader
            playlist={playlist}
            artworkUrl={artworkUrl}
            trackCount={tracks?.length ?? playlist.trackCount}
            breadcrumbItems={breadcrumbItems}
            folderMetadata={folderMetadata}
            actions={actions}
            onPlayAll={onPlayAll}
            onShuffle={onShuffle}
          />
        )}
        folder
        permalinkUrl={playlist.permalinkUrl}
        shareInfo={shareInfo}
        download={{ onDownloadTracks }}
        trackList={{
          virtualized: true,
          onRemoveFromPlaylist: playlist.isOwned ? setTrackToRemove : undefined,
          initialScrollOffset,
          onScrollOffsetChange: scrollPreservation ? saveScrollOffset : undefined,
        }}
        messages={{
          empty: 'library.detail.emptyPlaylist',
          error: 'library.detail.errorLoading',
        }}
      />

      {playlist.isOwned && (
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
      )}
    </>
  );
}
