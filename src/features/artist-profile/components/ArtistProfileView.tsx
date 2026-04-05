import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailViewLayout } from '@/components/detail-view/DetailViewLayout';
import { ArtistAvatarImage } from '@/components/ArtistAvatarImage';
import { getArtworkUrl } from '@/lib/soundcloud';

import { useArtistProfile } from '../hooks/useArtistProfile';
import { useArtistTracks } from '../hooks/useArtistTracks';
import { ArtistProfileHeader } from './ArtistProfileHeader';
import type { SortDirection } from '@/lib/sort';
import type { TrackInfo } from '@/bindings';
import type { SortOption } from '../types';

const ARTIST_SORT_OPTIONS = [
  { key: 'recent', label: 'artistProfile.sortRecent' },
  { key: 'popular', label: 'artistProfile.sortPopular' },
] as const satisfies readonly { key: SortOption; label: string }[];

interface ArtistProfileViewProps {
  artistId: number;
  artistName: string;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function ArtistProfileView({
  artistId,
  artistName,
  onBack,
  onDownloadTracks,
}: ArtistProfileViewProps) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortOption>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: profile, isLoading: isProfileLoading } = useArtistProfile(artistId);
  const {
    data: tracksData,
    isLoading: isTracksLoading,
    isStreaming,
    error: tracksError,
    refetch: refetchTracks,
  } = useArtistTracks(artistId);

  useEffect(() => {
    setSortDirection('desc');
    setSort('recent');
  }, [artistId]);

  const tracks = useMemo(() => {
    const all = tracksData ?? [];
    if (sort === 'recent') {
      return [...all].sort((a, b) => b.id - a.id);
    }
    return all;
  }, [tracksData, sort]);

  const sortedTracks = useMemo(
    () => (sortDirection === 'asc' ? [...tracks].reverse() : tracks),
    [tracks, sortDirection],
  );

  const bannerUrl = profile?.visuals?.visuals?.[0]?.visual_url ?? null;
  const avatarUrl = profile ? getArtworkUrl(profile.avatar_url ?? null, 200) : null;

  return (
    <DetailViewLayout
      tracks={sortedTracks}
      isLoading={isTracksLoading}
      isStreaming={isStreaming}
      error={tracksError}
      onRetry={refetchTracks}
      title={profile?.username ?? artistName}
      resetKey={artistId}
      header={({ downloadAllAction, isDownloadEnabled }) => (
        <div className="flex flex-col gap-3 px-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground self-start"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('common.back')}
          </Button>

          {isProfileLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <div className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
              {bannerUrl && (
                <img src={bannerUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center">
                <div className="flex items-center gap-2.5 backdrop-blur-sm bg-black/50 rounded-lg px-4 py-1.5 ml-3">
                  <ArtistAvatarImage
                    avatarUrl={avatarUrl}
                    username={profile?.username ?? artistName}
                    className="w-9 h-9 ring-2 ring-white/20 shrink-0"
                  />
                  <h2 className="text-sm font-bold text-white truncate drop-shadow-sm max-w-56">
                    {profile?.username ?? artistName}
                  </h2>
                </div>
              </div>
            </div>
          )}

          <ArtistProfileHeader
            profile={profile}
            isLoading={isProfileLoading}
            isDownloadEnabled={isDownloadEnabled}
            showOrderToggle={(tracksData?.length ?? 0) > 1}
            actions={downloadAllAction}
          />
        </div>
      )}
      folder
      download={{ onDownloadTracks }}
      sort={{
        options: ARTIST_SORT_OPTIONS,
        active: sort,
        onChange: setSort,
        direction: sortDirection,
        onDirectionChange: setSortDirection,
      }}
      trackList={{
        virtualized: true,
        searchThreshold: 5,
      }}
      messages={{ empty: 'artistProfile.noTracks' }}
    />
  );
}
