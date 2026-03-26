import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { FolderMetadata } from '@/components/FolderMetadata';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { DetailHeader } from '@/components/DetailHeader';
import { PlaylistActionBar } from '@/features/library/components/PlaylistActionBar';
import { useArtistActivity } from '../hooks/useArtistActivity';
import { ArtistTrackItem } from './ArtistTrackItem';
import { ArtistAvatarImage } from './ArtistAvatarImage';
import { useIsDownloadEnabled } from '@/features/settings/hooks/useIsDownloadEnabled';
import { useSettingsStore } from '@/features/settings';
import { usePlayContext } from '@/features/player';
import { usePlayerControls } from '@/hooks/usePlayerControls';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { useTrackSelection } from '@/features/library/hooks/useTrackSelection';
import { useTrackPreloadHandlers } from '@/hooks/useTrackPreloadHandlers';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import { getArtworkUrl } from '@/lib/soundcloud';
import { getFolderName } from '@/lib/utils';
import type { FollowedArtist, TrackInfo } from '@/bindings';

interface ArtistDetailViewProps {
  artist: FollowedArtist;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function ArtistDetailView({ artist, onBack, onDownloadTracks }: ArtistDetailViewProps) {
  const { t } = useTranslation();
  const { items, isLoading, error, refetch } = useArtistActivity(artist.id);
  const isDownloadEnabled = useIsDownloadEnabled();
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [localPath, setLocalPath] = useState<string | undefined>(undefined);
  const effectivePath = localPath || defaultPath || undefined;

  const tracks = useMemo(() => items.map((item) => item.track), [items]);
  const { playTrack } = usePlayContext(tracks);
  const { currentTrackId, isPlaying, pause, resume } = usePlayerControls();

  const { downloadTrack, getTrackState, downloadedIds, downloadedCount } = useTrackDownloadState({
    tracks: tracks.length > 0 ? tracks : undefined,
    downloadPath: effectivePath ?? '',
    enabled: !isLoading,
  });

  const {
    selectedIds, toggleTrack, toggleAll, clearSelection,
    selectedCount, isAllSelected, selectedTracks, selectableCount,
  } = useTrackSelection(tracks, downloadedIds);

  const { handlePreloadOnHover: handleHoverTrack, handlePreloadImmediate: handleMouseDownTrack } = useTrackPreloadHandlers();

  const { selectFolder: handleChangeFolder } = useFolderSelection({
    defaultPath: effectivePath,
    dialogTitle: t('library.detail.changeFolder'),
    onSelected: setLocalPath,
    onPermissionDenied: () => toast.error(t('library.detail.folderPermissionDenied')),
  });

  const handleOpenFolder = useOpenDownloadFolder(effectivePath ?? null);

  const handleDownloadAll = useCallback(() => {
    onDownloadTracks(tracks, artist.username, effectivePath);
  }, [tracks, onDownloadTracks, artist.username, effectivePath]);

  const handleDownloadSelected = useCallback(async () => {
    await onDownloadTracks(selectedTracks, artist.username, effectivePath);
    clearSelection();
  }, [selectedTracks, artist.username, onDownloadTracks, clearSelection, effectivePath]);

  const handleDownloadTrack = useCallback(
    (track: TrackInfo) => downloadTrack(track),
    [downloadTrack],
  );

  const prevCountRef = useRef(0);
  const shouldAnimate = items.length > prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = items.length;
  }, [items.length]);

  const avatarUrl = getArtworkUrl(artist.avatar_url, 200);
  const folderName = useMemo(
    () => (effectivePath ? getFolderName(effectivePath) : undefined),
    [effectivePath],
  );
  const isCustomFolder = Boolean(localPath && localPath !== defaultPath);

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <DetailHeader
        onBack={onBack}
        title={artist.username}
        artwork={
          <ArtistAvatarImage
            avatarUrl={avatarUrl}
            username={artist.username}
            className="w-12 h-12 shrink-0"
          />
        }
        subtitle={
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
            <span className="truncate">
              {t('newTracks.trackCount', { count: items.length })}
            </span>
            <FolderMetadata
              folderName={folderName}
              isCustomFolder={isCustomFolder}
              downloadedCount={downloadedCount}
              isDownloadEnabled={isDownloadEnabled}
              onChangeFolder={handleChangeFolder}
              onOpenFolder={handleOpenFolder}
            />
          </p>
        }
        actions={
          isDownloadEnabled && items.length > 0 ? (
            <Button size="sm" onClick={handleDownloadAll} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />
              {t('newTracks.downloadAll')}
            </Button>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('newTracks.error')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('newTracks.retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t('newTracks.empty')}
        </p>
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          {isDownloadEnabled && selectableCount > 0 && (
            <div className="flex items-center gap-3 px-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleAll}
                className="shrink-0"
              />
              <span className="text-xs text-muted-foreground cursor-pointer select-none" onClick={toggleAll}>
                {t(isAllSelected ? 'library.detail.deselectAll' : 'library.detail.selectAll')}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5 overflow-y-auto min-h-0">
            {items.map((item, index) => (
              <ArtistTrackItem
                key={`${item.track.id}-${item.activity_type}`}
                item={item}
                index={index}
                staggerIndex={index}
                animate={shouldAnimate}
                isSelected={selectedIds.has(item.track.id)}
                onToggle={toggleTrack}
                downloadState={getTrackState(item.track.id)}
                onDownload={handleDownloadTrack}
                onPlay={playTrack}
                onPause={pause}
                onResume={resume}
                isCurrentlyPlaying={currentTrackId === item.track.id}
                isPlayerPlaying={isPlaying}
                onHoverTrack={handleHoverTrack}
                onMouseDownTrack={handleMouseDownTrack}
                isDownloadEnabled={isDownloadEnabled}
              />
            ))}
          </div>
        </>
      )}

      <PlaylistActionBar selectedCount={selectedCount} onDownload={handleDownloadSelected} />
    </div>
  );
}
