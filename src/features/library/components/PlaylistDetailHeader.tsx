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
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('library.detail.back')}
      </Button>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Music className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate">{playlist.title}</h2>
          <p className="text-sm text-muted-foreground truncate">{playlist.username}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
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
