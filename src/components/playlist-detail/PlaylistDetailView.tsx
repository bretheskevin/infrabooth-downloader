import { useState, useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import type { ShareTrackInfo } from '@/features/messages/store';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';
import { TrackListView } from '@/components/track-list/TrackListView';
import { usePlaylistArtwork } from '@/features/library/hooks/usePlaylistArtwork';
import { useRemoveFromPlaylist } from '@/features/library/hooks/useRemoveFromPlaylist';
import { useIsSignedIn } from '@/features/auth/store';
import { useLibraryStore } from '@/features/library/store';
import { useLikePlaylist, type LikePlaylistInput } from '@/hooks/useLikePlaylist';
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
  const isSignedIn = useIsSignedIn();
  const { data: tracks, isLoading, isStreaming, error, refetch } = usePlaylistTracks(playlist.id, playlist.secretToken, initialTracks);

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

  const [edited, setEdited] = useState<{ title: string; isPublic: boolean } | null>(null);
  const [prevPlaylistId, setPrevPlaylistId] = useState(playlist.id);
  if (prevPlaylistId !== playlist.id) {
    setPrevPlaylistId(playlist.id);
    setEdited(null);
  }
  const displayed = edited ? { ...playlist, title: edited.title, isPublic: edited.isPublic } : playlist;

  const needsArtwork = (!playlist.artworkUrl || edited !== null) && !initialTracks;
  const { data: resolvedArtwork } = usePlaylistArtwork(playlist.id, playlist.secretToken, needsArtwork);
  // After an edit the auto-generated mosaic may change, so prefer the freshly resolved artwork.
  const artworkUrl = edited !== null ? (resolvedArtwork ?? playlist.artworkUrl ?? null) : (playlist.artworkUrl ?? resolvedArtwork ?? null);

  const isOwned = playlist.isOwned;

  const shareInfo: ShareTrackInfo | undefined =
    playlist.permalinkUrl && playlist.username
      ? {
          trackId: playlist.id,
          title: displayed.title,
          artist: playlist.username,
          artworkUrl: playlist.artworkUrl,
          permalinkUrl: playlist.permalinkUrl,
        }
      : undefined;

  const likeInput: LikePlaylistInput | undefined = !isOwned
    ? {
        id: playlist.id,
        title: displayed.title,
        artwork_url: playlist.artworkUrl,
        permalink_url: playlist.permalinkUrl,
        track_count: playlist.trackCount,
        username: playlist.username,
        user_id: playlist.userId,
        duration: playlist.duration,
      }
    : undefined;

  const likeState = useLikePlaylist(isSignedIn ? likeInput : undefined);

  return (
    <>
      <TrackListView
        query={{ tracks, isLoading, isStreaming, error, onRetry: refetch }}
        source={{
          title: displayed.title,
          id: String(playlist.id),
          permalinkUrl: playlist.permalinkUrl,
          shareInfo,
          likeState,
          deleteAction: isOwned
            ? { playlistId: playlist.id, onDeleteSuccess: () => useLibraryStore.getState().setLibraryView({ view: 'list' }) }
            : undefined,
          editAction: isOwned
            ? {
                playlistId: playlist.id,
                isPublic: displayed.isPublic,
                isPublicKnown: playlist.isPublicKnown,
                tracksReady: !isLoading && !isStreaming,
                onEdited: (title, isPublic) => setEdited({ title, isPublic }),
              }
            : undefined,
        }}
        resetKey={playlist.id}
        header={({ actions, folderMetadata, onPlayAll, onShuffle }) => (
          <PlaylistDetailHeader
            playlist={displayed}
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
        download={{ onDownloadTracks }}
        trackList={{
          virtualized: true,
          onRemoveFromPlaylist: isOwned ? setTrackToRemove : undefined,
          initialScrollOffset,
          onScrollOffsetChange: scrollPreservation ? saveScrollOffset : undefined,
        }}
        messages={{
          empty: 'library.detail.emptyPlaylist',
          error: 'library.detail.errorLoading',
        }}
      />

      {isOwned && (
        <RemoveFromPlaylistDialog
          open={trackToRemove !== null}
          trackTitle={trackToRemove?.title ?? ''}
          playlistTitle={displayed.title}
          isRemoving={removingFromPlaylistId === playlist.id}
          onConfirm={() => {
            if (trackToRemove) {
              void removeFromPlaylist(playlist.id, displayed.title, trackToRemove.id);
            }
          }}
          onCancel={() => setTrackToRemove(null)}
        />
      )}
    </>
  );
}
