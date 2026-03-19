import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { useSettingsStore } from '@/features/settings';
import { useFolderSelection, useTrackDownload, useMergedTrackState } from '@/hooks';
import { useShallow } from 'zustand/react/shallow';
import { usePlayContext, usePlayerStore } from '@/features/player';
import { preloadOnHover, preloadImmediate } from '@/features/player/url-cache';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import { useTrackSelection } from '../hooks/useTrackSelection';
import { useDownloadedTracks } from '../hooks/useDownloadedTracks';
import { PlaylistDetailHeader } from './PlaylistDetailHeader';
import { filterTracks } from '../utils/filterTracks';
import { sortTracks } from '../utils/sortTracks';
import { SearchBar } from '@/components/ui/search-bar';
import { PlaylistTrackList } from './PlaylistTrackList';
import type { SortDirection, SortField } from '../types';
import { SelectionFloatingBar } from './SelectionFloatingBar';

const MIN_TRACKS_FOR_SEARCH = 5;

interface PlaylistDetailViewProps {
  playlist: LibraryPlaylist;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
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

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [localPath, setLocalPath] = useState<string | undefined>(undefined);
  const effectivePath = localPath || defaultPath || undefined;

  const { downloadTrack, getTrackState: getRawTrackState, completedCount: inlineCompletedCount, reconcile } = useTrackDownload(effectivePath ?? '');

  const { downloadedIds, downloadedCount } = useDownloadedTracks(tracks, effectivePath, !isStreaming, inlineCompletedCount);

  const getTrackState = useMergedTrackState(getRawTrackState, downloadedIds, reconcile);

  useEffect(() => {
    setSearchQuery('');
    setSortField('default');
    setSortDirection('asc');
    setLocalPath(undefined);
  }, [playlist.id]);

  const filteredTracks = useMemo(
    () => filterTracks(tracks ?? [], searchQuery),
    [tracks, searchQuery],
  );

  const displayTracks = useMemo(
    () => sortTracks(filteredTracks, sortField, sortDirection),
    [filteredTracks, sortField, sortDirection],
  );

  const { playTrack, syncQueue } = usePlayContext(displayTracks);
  const { currentTrackId, playerState } = usePlayerStore(
    useShallow((s) => ({ currentTrackId: s.currentTrack?.trackId, playerState: s.state })),
  );
  const playerActions = () => usePlayerStore.getState();

  const wasStreamingRef = useRef(false);
  useEffect(() => {
    const wasStreaming = wasStreamingRef.current;
    wasStreamingRef.current = isStreaming;

    if (wasStreaming && !isStreaming && currentTrackId) {
      syncQueue();
    }
  }, [isStreaming, currentTrackId, syncQueue]);

  const showSkeleton = isLoading && (!tracks || tracks.length === 0);

  const {
    selectedIds,
    toggleTrack,
    toggleAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    selectedTracks,
    selectableCount,
  } = useTrackSelection(displayTracks, downloadedIds);

  const { selectFolder: handleChangeFolder } = useFolderSelection({
    defaultPath: effectivePath,
    dialogTitle: t('library.detail.changeFolder'),
    onSelected: setLocalPath,
    onPermissionDenied: () => toast.error(t('library.detail.folderPermissionDenied')),
  });

  const folderName = useMemo(
    () => effectivePath ? effectivePath.split(/[/\\]/).filter(Boolean).pop() : undefined,
    [effectivePath],
  );
  const isCustomFolder = Boolean(localPath && localPath !== defaultPath);

  const handleDownloadAll = useCallback(() => {
    if (tracks && tracks.length > 0) onDownloadTracks(tracks, playlist.title, effectivePath);
  }, [tracks, playlist.title, onDownloadTracks, effectivePath]);

  const handleDownloadSelected = useCallback(async () => {
    await onDownloadTracks(selectedTracks, playlist.title, effectivePath);
    clearSelection();
  }, [selectedTracks, playlist.title, onDownloadTracks, clearSelection, effectivePath]);

  const handleHoverTrack = useCallback(
    (track: TrackInfo) => preloadOnHover(track.id, track.permalink_url),
    [],
  );

  const handleMouseDownTrack = useCallback(
    (track: TrackInfo) => preloadImmediate(track.id, track.permalink_url),
    [],
  );

  const handleDownloadTrack = useCallback(
    (track: TrackInfo) => {
      downloadTrack(track);
    },
    [downloadTrack],
  );

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <PlaylistDetailHeader
        playlist={playlist}
        artworkUrl={artworkUrl}
        trackCount={tracks?.length ?? playlist.track_count}
        onBack={onBack}
        onDownloadAll={handleDownloadAll}
        isDownloadDisabled={!tracks || tracks.length === 0}
        downloadedCount={downloadedCount}
        folderName={folderName}
        isCustomFolder={isCustomFolder}
        onChangeFolder={handleChangeFolder}
        showOrderToggle={(tracks?.length ?? 0) > 1}
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

      {tracks && tracks.length >= MIN_TRACKS_FOR_SEARCH && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('library.detail.filterPlaceholder')}
          autoFocus
        />
      )}

      {tracks && tracks.length === 0 && !isLoading && (
        <p className="text-center py-12 text-sm text-muted-foreground">
          {t('library.detail.emptyPlaylist')}
        </p>
      )}

      {tracks && tracks.length > 0 && displayTracks.length === 0 && (
        <p className="text-center py-12 text-sm text-muted-foreground">
          {t('library.detail.noFilterResults')}
        </p>
      )}

      {displayTracks.length > 0 && (
        <PlaylistTrackList
          tracks={displayTracks}
          isStreaming={isStreaming}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          hasSelectableTracks={selectableCount > 0}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortFieldChange={setSortField}
          onSortDirectionChange={setSortDirection}
          onToggleTrack={toggleTrack}
          onToggleAll={toggleAll}
          getTrackState={getTrackState}
          onDownloadTrack={handleDownloadTrack}
          onPlayTrack={playTrack}
          onPauseTrack={playerActions().pause}
          onResumeTrack={playerActions().resume}
          currentlyPlayingId={currentTrackId}
          isPlayerPlaying={playerState === 'playing'}
          onHoverTrack={handleHoverTrack}
          onMouseDownTrack={handleMouseDownTrack}
        />
      )}

      <SelectionFloatingBar
        selectedCount={selectedCount}
        onDownload={handleDownloadSelected}
      />
    </div>
  );
}
