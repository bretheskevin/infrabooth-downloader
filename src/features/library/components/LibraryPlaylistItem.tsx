import { Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import type { LibraryPlaylist } from '../types';

interface LibraryPlaylistItemProps {
  playlist: LibraryPlaylist;
  onSelect: (permalinkUrl: string) => void;
}

export function LibraryPlaylistItem({ playlist, onSelect }: LibraryPlaylistItemProps) {
  const { t } = useTranslation();
  const needsArtwork = !playlist.artwork_url;
  const { data: resolvedArtwork } = usePlaylistArtwork(
    playlist.id,
    playlist.secret_token,
    needsArtwork,
  );
  const artworkUrl = playlist.artwork_url ?? resolvedArtwork ?? null;

  return (
    <Button
      variant="ghost"
      className="flex items-center gap-3 w-full h-auto p-2.5 text-left justify-start"
      onClick={() => onSelect(playlist.permalink_url)}
    >
      <div className="flex-shrink-0">
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={playlist.title}
            className="w-12 h-12 rounded-md object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center"
            data-testid="library-item-artwork-placeholder"
          >
            <Music className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{playlist.title}</p>
        <p className="text-xs text-muted-foreground truncate">{playlist.username}</p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {t('download.trackCount', { count: playlist.track_count })}
      </span>
    </Button>
  );
}
