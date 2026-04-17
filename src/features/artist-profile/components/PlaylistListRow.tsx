import { useTranslation } from 'react-i18next';

import { PlaylistArtwork } from './PlaylistArtwork';
import type { ArtistPlaylist } from '@/bindings';

interface PlaylistListRowProps {
  playlist: ArtistPlaylist;
  onClick: () => void;
}

export function PlaylistListRow({ playlist, onClick }: PlaylistListRowProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        <PlaylistArtwork artworkUrl={playlist.artwork_url} title={playlist.title} size="lg" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{playlist.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t('artistProfile.playlistTrackCount', { count: playlist.track_count })}
        </p>
      </div>
    </button>
  );
}
