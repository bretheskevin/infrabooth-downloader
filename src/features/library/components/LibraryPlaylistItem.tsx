import { Download, Loader2, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useIsDownloadEnabled } from '@/features/settings';
import { ArtistLink } from '@/components/ArtistLink';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { cn } from '@/lib/utils';
import { usePlaylistArtwork } from '../hooks/usePlaylistArtwork';
import type { LibraryPlaylist } from '@/bindings';

interface LibraryPlaylistItemProps {
  playlist: LibraryPlaylist;
  onOpenDetail: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function LibraryPlaylistItem({ playlist, onOpenDetail, onDownload, isDownloading }: LibraryPlaylistItemProps) {
  const { t } = useTranslation();
  const isWidescreen = useIsWidescreen();
  const isDownloadEnabled = useIsDownloadEnabled();
  const needsArtwork = !playlist.artwork_url;
  const { data: resolvedArtwork } = usePlaylistArtwork(playlist.id, playlist.secret_token, needsArtwork);
  const artworkUrl = playlist.artwork_url ?? resolvedArtwork ?? null;

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 w-full h-auto p-2.5 text-left justify-start',
        isWidescreen
          ? 'rounded-xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-elevated transition-all'
          : 'rounded-md hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <button
        type="button"
        className="absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={onOpenDetail}
        aria-label={playlist.title}
      />
      <div className="flex-shrink-0">
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={playlist.title}
            className={cn('object-cover', isWidescreen ? 'w-[52px] h-[52px] rounded-lg' : 'w-12 h-12 rounded-md')}
          />
        ) : (
          <div
            className={cn(
              'bg-secondary flex items-center justify-center',
              isWidescreen ? 'w-[52px] h-[52px] rounded-lg' : 'w-12 h-12 rounded-md',
            )}
            data-testid="library-item-artwork-placeholder"
          >
            <Music className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{playlist.title}</p>
        <ArtistLink
          userId={playlist.user_id}
          username={playlist.username}
          className="relative z-10 block text-xs text-muted-foreground truncate max-w-full"
        />
      </div>
      <span className={cn('text-xs text-muted-foreground flex-shrink-0', isWidescreen && 'tabular-nums')}>
        {t('download.trackCount', { count: playlist.track_count })}
      </span>
      {isDownloadEnabled && (
        <Button
          variant="ghost"
          size="icon"
          className="relative z-10 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t('library.detail.download')}
          disabled={isDownloading}
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
