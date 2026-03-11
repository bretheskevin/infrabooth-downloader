import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, ChevronRight, Download, Folder, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LibraryPlaylist } from '@/bindings';

interface PlaylistDetailHeaderProps {
  playlist: LibraryPlaylist;
  artworkUrl: string | null;
  trackCount: number;
  onBack: () => void;
  onDownloadAll: () => void;
  isDownloadDisabled?: boolean;
  downloadedCount: number;
  folderName: string | undefined;
  isCustomFolder: boolean;
  onChangeFolder: () => void;
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
  downloadedCount,
  folderName,
  isCustomFolder,
  onChangeFolder,
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
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
            <span className="truncate">
              {playlist.username}
              {' · '}
              {t('library.detail.tracks', { count: trackCount })}
              {' · '}
              {formatTotalDuration(playlist.duration)}
            </span>
            {folderName && (
              <>
                <span className="text-border">·</span>
                <button
                  type="button"
                  onClick={onChangeFolder}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border border-border/50 bg-muted/30 hover:bg-muted transition-colors shrink-0 max-w-[200px]"
                  aria-label={t('library.detail.changeFolder')}
                >
                  <Folder className="h-3 w-3 shrink-0" />
                  <span className="truncate">{folderName}</span>
                  {isCustomFolder && (
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">
                      ({t('library.detail.customFolder')})
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 shrink-0" />
                </button>
              </>
            )}
            {downloadedCount > 0 && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 shrink-0"
                aria-label={t('library.detail.downloadedCount', { count: downloadedCount })}
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {t('library.detail.downloadedCount', { count: downloadedCount })}
              </span>
            )}
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
