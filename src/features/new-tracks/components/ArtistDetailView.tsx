import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { FolderMetadata } from '@/components/FolderMetadata';
import { Button } from '@/components/ui/button';
import { SelectAllCheckbox } from '@/components/SelectAllCheckbox';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { DetailHeader } from '@/components/DetailHeader';
import { SelectionActionBar } from '@/components/SelectionActionBar';
import { useDownloadSelected } from '@/hooks/useDownloadSelected';
import { useArtistActivity } from '../hooks/useArtistActivity';
import { TrackListProvider, InteractiveTrackRow } from '@/components/InteractiveTrackRow';
import { ArtistAvatarImage } from './ArtistAvatarImage';
import { ActivityBadge } from './ActivityBadge';
import { useIsDownloadEnabled } from '@/features/settings/hooks/useIsDownloadEnabled';
import { useSettingsStore } from '@/features/settings';
import { usePlayContext } from '@/features/player';
import { useTrackDownloadState } from '@/hooks/useTrackDownloadState';
import { useTrackSelection } from '@/features/library/hooks/useTrackSelection';
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import { getArtworkUrl } from '@/lib/soundcloud';
import { getFolderName } from '@/lib/utils';
import type { ActivityItem, ActivityType, FollowedArtist, TrackInfo } from '@/bindings';
import { useNewTracksStore } from '../store';
import { ActivityFilterChips } from './ActivityFilterChips';

interface ArtistDetailViewProps {
  artist: FollowedArtist;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function ArtistDetailView({ artist, onBack, onDownloadTracks }: ArtistDetailViewProps) {
  const { t } = useTranslation();
  const { items, isLoading, error, refetch } = useArtistActivity(artist.id);
  const activityFilter = useNewTracksStore((s) => s.activityFilter);
  const setActivityFilter = useNewTracksStore.getState().setActivityFilter;

  const filteredItems = useMemo(() => {
    if (activityFilter === 'all') return items;
    const type: ActivityType = activityFilter === 'new' ? 'Track' : 'Repost';
    return items.filter((item: ActivityItem) => item.activity_type === type);
  }, [items, activityFilter]);
  const isDownloadEnabled = useIsDownloadEnabled();
  const defaultPath = useSettingsStore((s) => s.downloadPath);
  const [localPath, setLocalPath] = useState<string | undefined>(undefined);
  const effectivePath = localPath || defaultPath || undefined;

  const tracks = useMemo(() => filteredItems.map((item) => item.track), [filteredItems]);
  const { playTrack } = usePlayContext(tracks);

  const { downloadTrack, downloadedIds, downloadedCount } = useTrackDownloadState({
    tracks: tracks.length > 0 ? tracks : undefined,
    downloadPath: effectivePath ?? '',
    enabled: !isLoading,
  });

  const {
    selectedIds, toggleTrack, toggleAll, clearSelection,
    selectedCount, isAllSelected, selectedTracks, selectableCount,
  } = useTrackSelection(tracks, downloadedIds);

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

  const handleDownloadSelected = useDownloadSelected(
    selectedTracks, clearSelection, onDownloadTracks, artist.username, effectivePath,
  );

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
              {t('newTracks.trackCount', { count: filteredItems.length })}
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
          isDownloadEnabled && filteredItems.length > 0 ? (
            <Button size="sm" onClick={handleDownloadAll} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />
              {t('newTracks.downloadAll')}
            </Button>
          ) : undefined
        }
      />

      {!isLoading && items.length > 0 && (
        <div className="px-3">
          <ActivityFilterChips active={activityFilter} onChange={setActivityFilter} />
        </div>
      )}

      {isLoading && <TrackRowSkeletonList count={5} />}

      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('newTracks.error')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('newTracks.retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && filteredItems.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t(items.length > 0 ? 'newTracks.emptyFilter' : 'newTracks.empty')}
        </p>
      )}

      {!isLoading && !error && filteredItems.length > 0 && (
        <>
          {isDownloadEnabled && selectableCount > 0 && (
            <SelectAllCheckbox isAllSelected={isAllSelected} onToggleAll={toggleAll} className="px-3" />
          )}
          <TrackListProvider
            playTrack={playTrack}
            downloadTrack={handleDownloadTrack}
            isDownloadEnabled={isDownloadEnabled}
            downloadedIds={downloadedIds}
            selection={{ selectedIds, toggleTrack }}
            animate={shouldAnimate}
          >
            <div className="flex flex-col gap-0.5 overflow-y-auto min-h-0">
              {filteredItems.map((item, index) => (
                <InteractiveTrackRow
                  key={`${item.track.id}-${item.activity_type}`}
                  track={item.track}
                  index={index}
                  subtitleSlot={
                    <ActivityBadge
                      activityType={item.activity_type}
                      createdAt={item.created_at}
                    />
                  }
                />
              ))}
            </div>
          </TrackListProvider>
        </>
      )}

      <SelectionActionBar selectedCount={selectedCount} onDownload={handleDownloadSelected} />
    </div>
  );
}
