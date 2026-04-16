import { useTranslation } from 'react-i18next';
import { TrackListView } from '@/components/track-list/TrackListView';
import { DetailHeader } from '@/components/DetailHeader';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useArtistPlaylistTracks } from '../hooks/useArtistPlaylistTracks';
import { PlaylistArtwork } from './PlaylistArtwork';
import type { ArtistPlaylist, TrackInfo } from '@/bindings';

type PlaylistViewData = Omit<ArtistPlaylist, 'created_at'>;

interface ArtistPlaylistViewProps {
  playlist: PlaylistViewData;
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
  } = useArtistPlaylistTracks(playlist.id, playlist.secret_token);

  const artwork = <PlaylistArtwork artworkUrl={playlist.artwork_url} title={playlist.title} />;

  return (
    <TrackListView
      tracks={tracks}
      isLoading={isLoading}
      isStreaming={isStreaming}
      error={error}
      onRetry={refetch}
      title={playlist.title}
      resetKey={playlist.id}
      header={({ downloadAllAction, folderMetadata }) => (
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
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
              <span className="truncate">
                {t('artistProfile.playlistTrackCount', { count: playlist.track_count })}
              </span>
              {folderMetadata}
            </p>
          }
          actions={downloadAllAction}
        />
      )}
      folder
      download={{ onDownloadTracks }}
      messages={{ empty: 'artistProfile.noPlaylistTracks' }}
    />
  );
}
