import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { DetailHeader } from '@/components/DetailHeader';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { TrackListView } from '@/components/track-list/TrackListView';
import { getArtworkUrl } from '@/lib/soundcloud';
import type { FollowedArtist, ReleaseActivityItem, TrackInfo } from '@/bindings';
import { DEFAULT_STALE_TIME } from '@/lib/query';
import { RELEASE_TYPE_KEYS } from '../constants';

interface ReleaseTracklistViewProps {
  artist: FollowedArtist;
  release: ReleaseActivityItem;
  onBackToReleases: () => void;
  onBackToCarousel: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function ReleaseTracklistView({
  artist,
  release,
  onBackToReleases,
  onBackToCarousel,
  onDownloadTracks,
}: ReleaseTracklistViewProps) {
  const { t } = useTranslation();
  const info = release.release;
  const artworkUrl = getArtworkUrl(info.artwork_url, 300);
  const typeLabel = t(RELEASE_TYPE_KEYS[info.release_type]);

  const { data: tracks, isLoading, error, refetch } = useQuery({
    queryKey: ['release-tracks', info.id],
    queryFn: () => api.getReleaseTracks(info.id),
    staleTime: DEFAULT_STALE_TIME,
  });

  const artwork = artworkUrl ? (
    <img src={artworkUrl} alt={info.title} className="w-14 h-14 rounded-md object-cover shrink-0" />
  ) : (
    <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-lg font-bold shrink-0">
      {info.title.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <TrackListView
      tracks={tracks}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      title={info.title}
      resetKey={info.id}
      header={({ downloadAllAction, folderMetadata }) => (
        <DetailHeader
          navigation={<Breadcrumb items={[
            { label: t('newReleases.title'), onClick: onBackToCarousel },
            { label: artist.username, onClick: onBackToReleases },
            { label: info.title },
          ]} />}
          artwork={artwork}
          title={info.title}
          subtitle={
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
              <span className="truncate">
                {artist.username} · {typeLabel} · {t('newReleases.trackCount', { count: info.track_count })}
              </span>
              {folderMetadata}
            </p>
          }
          actions={downloadAllAction}
        />
      )}
      folder
      download={{ onDownloadTracks }}
      messages={{
        empty: 'newReleases.empty',
        error: 'newReleases.error',
      }}
    />
  );
}
