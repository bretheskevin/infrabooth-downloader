import { useTranslation } from 'react-i18next';
import { PlaylistArtwork } from '@/features/artist-profile/components/PlaylistArtwork';
import { useSelectedPlaylistStore } from '../selected-playlist-store';
import type { ArtistPlaylist } from '@/bindings';

interface PlaylistSearchResultItemProps {
  playlist: ArtistPlaylist;
}

export function PlaylistSearchResultItem({ playlist }: PlaylistSearchResultItemProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    useSelectedPlaylistStore.getState().openPlaylist(playlist);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-3 w-full px-3 py-2 text-left border-b border-border/50 last:border-b-0 hover:bg-secondary/50 transition-colors"
    >
      <PlaylistArtwork artworkUrl={playlist.artwork_url ?? null} title={playlist.title} />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{playlist.title}</span>
        <span className="text-xs text-muted-foreground">
          <span>{t('search.playlistTrackCount', { count: playlist.track_count })}</span>
          {playlist.user?.username && (
            <>
              {' · '}
              <span>{playlist.user.username}</span>
            </>
          )}
        </span>
      </div>
    </button>
  );
}
