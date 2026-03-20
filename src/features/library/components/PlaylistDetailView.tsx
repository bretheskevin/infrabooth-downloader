import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { useFolderSelection } from '@/hooks';
import { useShallow } from 'zustand/react/shallow';
import { usePlayContext, usePlayerStore } from '@/features/player';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import { useTrackSelection } from '../hooks/useTrackSelection';
import { usePlaylistViewState } from '../hooks/usePlaylistViewState';
import { useSyncQueueOnStreamEnd } from '../hooks/useSyncQueueOnStreamEnd';
import { usePlaylistTrackHandlers } from '../hooks/usePlaylistTrackHandlers';
import { useRemoveFromPlaylist } from '../hooks/useRemoveFromPlaylist';
import { PlaylistDetailHeader } from './PlaylistDetailHeader';
import { PlaylistLoadingState } from './PlaylistLoadingState';
import { PlaylistErrorState } from './PlaylistErrorState';
import { PlaylistEmptyStates } from './PlaylistEmptyStates';
import { SearchBar } from '@/components/ui/search-bar';
import { PlaylistTrackList } from './PlaylistTrackList';
import { PlaylistActionBar } from './PlaylistActionBar';
import { RemoveFromPlaylistDialog } from './RemoveFromPlaylistDialog';

const MIN_TRACKS_FOR_SEARCH = 5;

interface PlaylistDetailViewProps {
  playlist: LibraryPlaylist;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function PlaylistDetailView({ playlist, onBack, onDownloadTracks }: PlaylistDetailViewProps) {
  const { t } = useTranslation();
  const { data: tracks, isLoading, isStreaming, error, refetch } = usePlaylistTracks(playlist.id);

  const [trackToRemove, setTrackToRemove] = useState<TrackInfo | null>(null);
  const { removeFromPlaylist, removingFromPlaylistId } = useRemoveFromPlaylist(() => {
    setTrackToRemove(null);
  });

  const needsArtwork = !playlist.artwork_url;
  const { data: resolvedArtwork } = usePlaylistArtwork(playlist.id, playlist.secret_token, needsArtwork);
  const artworkUrl = playlist.artwork_url ?? resolvedArtwork ?? null;

  const viewState = usePlaylistViewState(playlist.id, tracks, isStreaming);
  const { displayTracks, downloadedIds, effectivePath, setLocalPath, downloadTrack } = viewState;

  const { playTrack, syncQueue } = usePlayContext(displayTracks);
  const { currentTrackId, playerState } = usePlayerStore(
    useShallow((s) => ({ currentTrackId: s.currentTrack?.trackId, playerState: s.state })),
  );

  useSyncQueueOnStreamEnd(isStreaming, currentTrackId, syncQueue);

  const selection = useTrackSelection(displayTracks, downloadedIds);
  const { selectedIds, toggleTrack, toggleAll, clearSelection, selectedCount, isAllSelected, selectedTracks, selectableCount } = selection;

  const handlers = usePlaylistTrackHandlers({
    tracks,
    playlistTitle: playlist.title,
    effectivePath,
    selectedTracks,
    downloadTrack,
    clearSelection,
    onDownloadTracks,
  });

  const { selectFolder: handleChangeFolder } = useFolderSelection({
    defaultPath: effectivePath,
    dialogTitle: t('library.detail.changeFolder'),
    onSelected: setLocalPath,
    onPermissionDenied: () => toast.error(t('library.detail.folderPermissionDenied')),
  });

  const showSkeleton = isLoading && (!tracks || tracks.length === 0);
  const showSearch = tracks && tracks.length >= MIN_TRACKS_FOR_SEARCH;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <PlaylistDetailHeader
        playlist={playlist}
        artworkUrl={artworkUrl}
        trackCount={tracks?.length ?? playlist.track_count}
        onBack={onBack}
        onDownloadAll={handlers.handleDownloadAll}
        isDownloadDisabled={!tracks || tracks.length === 0}
        downloadedCount={viewState.downloadedCount}
        folderName={viewState.folderName}
        folderPath={effectivePath}
        isCustomFolder={viewState.isCustomFolder}
        onChangeFolder={handleChangeFolder}
        showOrderToggle={(tracks?.length ?? 0) > 1}
      />

      <PlaylistLoadingState showSkeleton={showSkeleton} />
      <PlaylistErrorState error={error} tracks={tracks} onRetry={refetch} />

      {showSearch && (
        <SearchBar
          value={viewState.searchQuery}
          onChange={viewState.setSearchQuery}
          placeholder={t('library.detail.filterPlaceholder')}
          autoFocus
        />
      )}

      <PlaylistEmptyStates tracks={tracks} displayTracks={displayTracks} isLoading={isLoading} />

      {displayTracks.length > 0 && (
        <PlaylistTrackList
          tracks={displayTracks}
          isStreaming={isStreaming}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          hasSelectableTracks={selectableCount > 0}
          sortField={viewState.sortField}
          sortDirection={viewState.sortDirection}
          onSortFieldChange={viewState.setSortField}
          onSortDirectionChange={viewState.setSortDirection}
          onToggleTrack={toggleTrack}
          onToggleAll={toggleAll}
          getTrackState={viewState.getTrackState}
          onDownloadTrack={handlers.handleDownloadTrack}
          onPlayTrack={playTrack}
          onPauseTrack={() => usePlayerStore.getState().pause()}
          onResumeTrack={() => usePlayerStore.getState().resume()}
          currentlyPlayingId={currentTrackId}
          isPlayerPlaying={playerState === 'playing'}
          onHoverTrack={handlers.handleHoverTrack}
          onMouseDownTrack={handlers.handleMouseDownTrack}
          onRemoveFromPlaylist={playlist.is_owned ? setTrackToRemove : undefined}
        />
      )}

      <PlaylistActionBar selectedCount={selectedCount} onDownload={handlers.handleDownloadSelected} />

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
    </div>
  );
}
