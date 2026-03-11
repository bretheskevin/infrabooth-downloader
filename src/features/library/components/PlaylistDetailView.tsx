import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import { useTrackSelection } from '../hooks/useTrackSelection';
import { PlaylistDetailHeader } from './PlaylistDetailHeader';
import { PlaylistTrackList } from './PlaylistTrackList';
import { SelectionFloatingBar } from './SelectionFloatingBar';

interface PlaylistDetailViewProps {
  playlist: LibraryPlaylist;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string) => void | Promise<void>;
}

function TrackSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="w-8 h-8 rounded shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-10 shrink-0" />
    </div>
  );
}

function getErrorMessageKey(error: Error): string {
  const msg = error.message ?? '';
  if (msg.includes('Authentication required') || msg.includes('AuthRequired')) {
    return 'errors.authExpired';
  }
  if (msg.includes('Rate limited') || msg.includes('RateLimited')) {
    return 'library.rateLimited';
  }
  return 'library.detail.errorLoading';
}

export function PlaylistDetailView({ playlist, onBack, onDownloadTracks }: PlaylistDetailViewProps) {
  const { t } = useTranslation();
  const { data: tracks, isLoading, isStreaming, error, refetch } = usePlaylistTracks(playlist.id);

  const needsArtwork = !playlist.artwork_url;
  const { data: resolvedArtwork } = usePlaylistArtwork(
    playlist.id,
    playlist.secret_token,
    needsArtwork,
  );
  const artworkUrl = playlist.artwork_url ?? resolvedArtwork ?? null;

  const showSkeleton = isLoading && (!tracks || tracks.length === 0);

  const {
    selectedIds,
    toggleTrack,
    toggleAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    selectedTracks,
  } = useTrackSelection(tracks ?? []);

  const handleDownloadAll = useCallback(() => {
    if (tracks && tracks.length > 0) onDownloadTracks(tracks, playlist.title);
  }, [tracks, playlist.title, onDownloadTracks]);

  const handleDownloadSelected = useCallback(async () => {
    await onDownloadTracks(selectedTracks, playlist.title);
    clearSelection();
  }, [selectedTracks, playlist.title, onDownloadTracks, clearSelection]);

  const handleDownloadTrack = useCallback(
    (track: TrackInfo) => {
      onDownloadTracks([track], playlist.title);
    },
    [playlist.title, onDownloadTracks],
  );

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <PlaylistDetailHeader
        playlist={playlist}
        artworkUrl={artworkUrl}
        trackCount={tracks?.length ?? playlist.track_count}
        onBack={onBack}
        onDownloadAll={handleDownloadAll}
        isDownloadDisabled={!tracks || tracks.length === 0}
      />

      {showSkeleton && (
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <TrackSkeletonRow key={i} />
          ))}
        </div>
      )}

      {error && !tracks && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-muted-foreground">{t(getErrorMessageKey(error))}</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            {t('library.detail.retry')}
          </Button>
        </div>
      )}

      {tracks && tracks.length === 0 && !isLoading && (
        <p className="text-center py-12 text-sm text-muted-foreground">
          {t('library.detail.emptyPlaylist')}
        </p>
      )}

      {tracks && tracks.length > 0 && (
        <PlaylistTrackList
          tracks={tracks}
          isStreaming={isStreaming}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          onToggleTrack={toggleTrack}
          onToggleAll={toggleAll}
          onDownloadTrack={handleDownloadTrack}
        />
      )}

      <SelectionFloatingBar
        selectedCount={selectedCount}
        onDownload={handleDownloadSelected}
      />
    </div>
  );
}
