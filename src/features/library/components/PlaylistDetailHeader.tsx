import { useTranslation } from 'react-i18next';
import { Music } from 'lucide-react';
import { DetailHeader } from '@/components/DetailHeader';
import { ArtistLink } from '@/components/ArtistLink';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { cn } from '@/lib/utils';
import type { LibraryPlaylist } from '@/bindings';
import { formatTotalDuration } from '@/lib/format';

interface PlaylistDetailHeaderProps {
  playlist: LibraryPlaylist;
  artworkUrl: string | null;
  trackCount: number;
  onBack: () => void;
  folderMetadata: React.ReactNode;
  actions?: React.ReactNode;
}

export function PlaylistDetailHeader({
  playlist,
  artworkUrl,
  trackCount,
  onBack,
  folderMetadata,
  actions,
}: PlaylistDetailHeaderProps) {
  const { t } = useTranslation();
  const isWidescreen = useIsWidescreen();

  return (
    <DetailHeader
      onBack={onBack}
      title={playlist.title}
      artwork={
        <div
          data-testid="artwork-container"
          className={cn("bg-muted overflow-hidden shrink-0", isWidescreen ? "w-[140px] h-[140px] rounded-xl" : "w-12 h-12 rounded-lg")}
        >
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Music data-testid="artwork-placeholder-icon" className={cn(isWidescreen ? "w-10 h-10" : "w-5 h-5")} />
            </div>
          )}
        </div>
      }
      subtitle={
        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 min-w-0">
          <span className="truncate min-w-0">
            <ArtistLink userId={playlist.user_id} username={playlist.username} />
            {` · ${t('library.detail.tracks', { count: trackCount })} · ${formatTotalDuration(playlist.duration)}`}
          </span>
          {folderMetadata}
        </div>
      }
      actions={actions}
    />
  );
}
