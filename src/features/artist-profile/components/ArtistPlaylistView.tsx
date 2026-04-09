import { useTranslation } from 'react-i18next';
import { DetailViewLayout } from '@/components/detail-view/DetailViewLayout';
import { DetailHeader } from '@/components/DetailHeader';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useArtistPlaylistTracks } from '../hooks/useArtistPlaylistTracks';
import { PlaylistArtwork } from './PlaylistArtwork';
import type { ArtistPlaylist, TrackInfo } from '@/bindings';

interface ArtistPlaylistViewProps {
  playlist: ArtistPlaylist;
  artistName: string;
  onBack: () => void;
  onDownloadTracks: (tracks: TrackInfo[], title: string, outputDir?: string) => void | Promise<void>;
}

export function ArtistPlaylistView({
  playlist,
  artistName,
  onBack,
  onDownloadTracks,
}: ArtistPlaylistViewProps) {
  const { t } = useTranslation();
  const {
    data: tracks,
    isLoading,
    isStreaming,
    error,
    refetch,
  } = useArtistPlaylistTracks(playlist.id);

  const artwork = <PlaylistArtwork artworkUrl={playlist.artwork_url} title={playlist.title} />;

  return (
    <DetailViewLayout
      tracks={tracks}
      isLoading={isLoading}
      isStreaming={isStreaming}
      error={error}
      onRetry={refetch}
      title={playlist.title}
      resetKey={playlist.id}
      header={({ downloadAllAction }) => (
        <DetailHeader
          navigation={
            <Breadcrumb
              items={[
                { label: artistName, onClick: onBack },
                { label: playlist.title },
              ]}
            />
          }
          artwork={artwork}
          title={playlist.title}
          subtitle={
            <p className="text-xs text-muted-foreground">
              {t('artistProfile.playlistTrackCount', { count: playlist.track_count })}
            </p>
          }
          actions={downloadAllAction}
        />
      )}
      folder
      download={{ onDownloadTracks }}
      trackList={{
        virtualized: true,
        searchThreshold: 5,
      }}
      messages={{ empty: 'artistProfile.noPlaylistTracks' }}
    />
  );
}
