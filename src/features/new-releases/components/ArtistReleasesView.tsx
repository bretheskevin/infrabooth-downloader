import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DetailHeader } from '@/components/DetailHeader';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { FilterChips } from '@/components/FilterChips';
import { ArtistAvatarImage } from '@/components/ArtistAvatarImage';
import { getArtworkUrl } from '@/lib/soundcloud';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { RefreshButton } from '@/components/ui/refresh-button';
import { useArtistReleases } from '../hooks/useArtistReleases';
import { useNewReleasesStore } from '../store';
import { ReleaseCard } from './ReleaseCard';
import type { FollowedArtist, ReleaseType } from '@/bindings';
import type { ReleaseFilter } from '../constants';

const RELEASE_FILTERS = [
  { key: 'all' as const, label: 'newReleases.filterAll' },
  { key: 'albums' as const, label: 'newReleases.filterAlbums' },
  { key: 'playlists' as const, label: 'newReleases.filterPlaylists' },
] as const satisfies readonly { key: ReleaseFilter; label: string }[];

const ALBUM_TYPES: ReleaseType[] = ['Album', 'EP', 'Single', 'Compilation'];

interface ArtistReleasesViewProps {
  artist: FollowedArtist;
  filter: ReleaseFilter;
  onBack: () => void;
}

export function ArtistReleasesView({ artist, filter, onBack }: ArtistReleasesViewProps) {
  const { t } = useTranslation();
  const { items, isLoading, error, refetch } = useArtistReleases(artist.id);
  const { setReleaseFilter, selectRelease } = useNewReleasesStore.getState();

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'albums') return items.filter((i) => ALBUM_TYPES.includes(i.release.release_type));
    return items.filter((i) => i.release.release_type === 'Playlist');
  }, [items, filter]);

  const avatarUrl = getArtworkUrl(artist.avatar_url, 200);

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <DetailHeader
        navigation={<Breadcrumb items={[
          { label: t('newReleases.title'), onClick: onBack },
          { label: artist.username },
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
          <p className="text-xs text-muted-foreground">
            {t('newReleases.releasesCount', { count: filteredItems.length })}
          </p>
        }
      />

      {items.length > 0 && (
        <FilterChips
          options={RELEASE_FILTERS}
          active={filter}
          onChange={setReleaseFilter}
        />
      )}

      {isLoading && <TrackRowSkeletonList />}

      {error && !isLoading && (
        <div className="flex flex-col items-center gap-2 py-12">
          <p className="text-sm text-muted-foreground">{t('newReleases.error')}</p>
          <RefreshButton onRefresh={refetch} aria-label={t('common.refresh')} />
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && !error && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {items.length > 0 ? t('newReleases.emptyFilter') : t('newReleases.empty')}
        </p>
      )}

      {!isLoading && filteredItems.length > 0 && (
        <div className="grid grid-cols-3 gap-3 overflow-y-auto">
          {filteredItems.map((item) => (
            <ReleaseCard
              key={`${item.release.id}-${item.activity_type}`}
              item={item}
              onClick={() => selectRelease(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
