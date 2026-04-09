import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/date';
import { PlaylistArtwork } from './PlaylistArtwork';
import type { ArtistPlaylist } from '@/bindings';

interface PlaylistCardProps {
  playlist: ArtistPlaylist;
  onClick: () => void;
}

export function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="rounded-lg overflow-hidden bg-muted/50 border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left h-auto p-0 w-full flex-col items-stretch"
    >
      <div className="relative aspect-square bg-muted">
        <PlaylistArtwork artworkUrl={playlist.artwork_url} title={playlist.title} size="lg" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent backdrop-blur-[2px] px-2 pb-1.5 pt-4">
          <p className="text-white text-xs font-semibold truncate">{playlist.title}</p>
          <p className="text-white/70 text-[10px]">
            {t('artistProfile.playlistTrackCount', { count: playlist.track_count })}
          </p>
        </div>
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          {formatRelativeTime(playlist.created_at, t)}
        </p>
      </div>
    </Button>
  );
}
