import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LibraryPlaylist } from '@/bindings';

interface PlaylistDetailHeaderProps {
  playlist: LibraryPlaylist;
  artworkUrl: string | null;
  trackCount: number;
  onBack: () => void;
  onDownloadAll: () => void;
  isDownloadDisabled?: boolean;
}

function formatTotalDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function PlaylistDetailHeader({
  playlist,
  artworkUrl,
  trackCount,
  onBack,
  onDownloadAll,
  isDownloadDisabled,
}: PlaylistDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('library.detail.back')}
      </Button>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Music className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold truncate leading-tight">{playlist.title}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {playlist.username}
            {' · '}
            {t('library.detail.tracks', { count: trackCount })}
            {' · '}
            {formatTotalDuration(playlist.duration)}
          </p>
        </div>
        <Button size="sm" onClick={onDownloadAll} disabled={isDownloadDisabled} className="gap-1.5 shrink-0">
          <Download className="h-3.5 w-3.5" />
          {t('library.detail.downloadAll')}
        </Button>
      </div>
    </div>
  );
}
