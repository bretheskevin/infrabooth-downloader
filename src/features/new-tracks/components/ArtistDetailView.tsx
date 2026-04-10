import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderMetadata } from '@/components/FolderMetadata';
import { DetailHeader } from '@/components/DetailHeader';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { DetailViewLayout } from '@/components/detail-view/DetailViewLayout';
import { useArtistActivity } from '../hooks/useArtistActivity';
import { ArtistAvatarImage } from '@/components/ArtistAvatarImage';
import { ActivityBadge } from './ActivityBadge';
import { getArtworkUrl } from '@/lib/soundcloud';
import type { ActivityItem, ActivityType, FollowedArtist, TrackInfo } from '@/bindings';
import { useArtistProfileStore } from '@/features/artist-profile';
import { useNewTracksStore } from '../store';
import type { ActivityFilter } from '../store';

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'newTracks.filterAll' },
  { key: 'new', label: 'newTracks.filterNew' },
  { key: 'reposted', label: 'newTracks.filterReposted' },
] as const satisfies readonly { key: ActivityFilter; label: string }[];

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

  const tracks = useMemo(() => filteredItems.map((item) => item.track), [filteredItems]);

  const activityByTrackId = useMemo(
    () => new Map(filteredItems.map((item) => [item.track.id, item])),
    [filteredItems],
  );

  const avatarUrl = getArtworkUrl(artist.avatar_url, 200);

  return (
    <DetailViewLayout
      tracks={tracks}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title={artist.username}
      resetKey={artist.id}
      header={({ downloadedCount, downloadAllAction, isDownloadEnabled, folder }) => (
        <DetailHeader
          navigation={<Breadcrumb items={[
            { label: t('newTracks.title'), onClick: onBack },
            { label: artist.username, onClick: () => useArtistProfileStore.getState().openProfile(artist.id, artist.username) },
          ]} />}
          artwork={
            <ArtistAvatarImage
              avatarUrl={avatarUrl}
              username={artist.username}
              className="w-12 h-12 shrink-0"
            />
          }
          title={artist.username}
          subtitle={
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
              <span className="truncate">
                {t('newTracks.trackCount', { count: filteredItems.length })}
              </span>
              <FolderMetadata
                folderName={folder.folderName}
                isCustomFolder={folder.isCustomFolder}
                downloadedCount={downloadedCount}
                isDownloadEnabled={isDownloadEnabled}
                onChangeFolder={folder.handleChangeFolder}
                onOpenFolder={folder.handleOpenFolder}
              />
            </p>
          }
          actions={downloadAllAction}
        />
      )}
      folder
      download={{ onDownloadTracks }}
      filters={items.length > 0 ? {
        options: ACTIVITY_FILTERS,
        active: activityFilter,
        onChange: setActivityFilter,
      } : undefined}
      trackList={{
        virtualized: false,
        subtitleSlot: (track) => {
          const item = activityByTrackId.get(track.id);
          if (!item) return null;
          return (
            <ActivityBadge
              activityType={item.activity_type}
              createdAt={item.created_at}
            />
          );
        },
      }}
      messages={{
        empty: items.length > 0 ? 'newTracks.emptyFilter' : 'newTracks.empty',
        error: 'newTracks.error',
      }}
    />
  );
}
