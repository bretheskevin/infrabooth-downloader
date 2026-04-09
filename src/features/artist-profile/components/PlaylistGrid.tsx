import { useTranslation } from 'react-i18next';
import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';
import { RefreshButton } from '@/components/ui/refresh-button';
import { useArtistPlaylists } from '../hooks/useArtistPlaylists';
import { PlaylistCard } from './PlaylistCard';
import type { ArtistPlaylist } from '@/bindings';

interface PlaylistGridProps {
  artistId: number;
  onSelectPlaylist: (playlist: ArtistPlaylist) => void;
}

export function PlaylistGrid({ artistId, onSelectPlaylist }: PlaylistGridProps) {
  const { t } = useTranslation();
  const { data: playlists, isLoading, error, refetch } = useArtistPlaylists(artistId);

  if (isLoading) return <TrackRowSkeletonList />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <p className="text-sm text-muted-foreground">{t('artistProfile.playlistsError')}</p>
        <RefreshButton onRefresh={refetch} aria-label={t('common.refresh')} />
      </div>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {t('artistProfile.noPlaylists')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          onClick={() => onSelectPlaylist(playlist)}
        />
      ))}
    </div>
  );
}
