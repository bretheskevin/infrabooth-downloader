import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { useSettingsStore } from '@/features/settings';
import { useFolderSelection } from '@/hooks';
import { usePlayContext, usePlayerStore } from '@/features/player';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import { useTrackSelection } from '../hooks/useTrackSelection';
import { useDownloadedTracks } from '../hooks/useDownloadedTracks';
import { PlaylistDetailHeader } from './PlaylistDetailHeader';
import { filterTracks } from '../utils/filterTracks';
import { sortTracks } from '../utils/sortTracks';
import { SearchBar } from '@/components/ui/search-bar';
import { PlaylistTrackList } from './PlaylistTrackList';
import type { SortMode } from '../types';
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
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [localPath, setLocalPath] = useState<string | undefined>(undefined);
  const effectivePath = localPath || defaultPath || undefined;

  const { downloadedIds, downloadedCount } = useDownloadedTracks(tracks, effectivePath, !isStreaming);

  useEffect(() => {
    setSearchQuery('');
    setSortMode('default');
    setLocalPath(undefined);
  }, [playlist.id]);

  const filteredTracks = useMemo(
    () => filterTracks(tracks ?? [], searchQuery),
    [tracks, searchQuery],
  );

  const displayTracks = useMemo(
    () => sortTracks(filteredTracks, sortMode),
    [filteredTracks, sortMode],
  );

  const { playTrack } = usePlayContext(displayTracks);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.trackId);
  const playerPause = usePlayerStore((s) => s.pause);

  const showSkeleton = isLoading && (!tracks || tracks.length === 0);

  const {
    selectedIds,
    toggleTrack,
    toggleAll,
    clearSelection,
    selectedCount,
    isAllSelected,
    selectedTracks,
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

  const handleDownloadTrack = useCallback(
    (track: TrackInfo) => {
      onDownloadTracks([track], playlist.title, effectivePath);
    },
    [playlist.title, onDownloadTracks, effectivePath],
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
          sortMode={sortMode}
          onSortChange={setSortMode}
          onToggleTrack={toggleTrack}
          onToggleAll={toggleAll}
          onDownloadTrack={handleDownloadTrack}
          downloadedIds={downloadedIds}
          onPlayTrack={playTrack}
          onPauseTrack={playerPause}
          currentlyPlayingId={currentTrackId}
        />
      )}

      <SelectionFloatingBar
        selectedCount={selectedCount}
        onDownload={handleDownloadSelected}
      />
    </div>
  );
}
