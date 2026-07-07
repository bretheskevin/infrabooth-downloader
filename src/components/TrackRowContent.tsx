import { Heart, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayOverlay } from '@/features/player';
import { TrackRowCore } from '@/components/TrackRowCore';
import { formatDuration, formatBytes } from '@/lib/format';
import type { TrackInfo } from '@/bindings';

interface DownloadProgress {
  progress: number;
  downloadedBytes: number | null;
  totalBytes: number | null;
}

interface TrackRowContentProps {
  track: TrackInfo;
  artworkUrl: string | null;
  isCurrentlyPlaying: boolean;
  isPlayerPlaying: boolean;
  isRowHovered: boolean;
  onPlayPause: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onArtistClick?: () => void;
  downloadProgress: DownloadProgress | null;
  subtitleSlot?: React.ReactNode;
  isLiked?: boolean;
}

export function TrackRowContent({
  track,
  artworkUrl,
  isCurrentlyPlaying,
  isPlayerPlaying,
  isRowHovered,
  onPlayPause,
  onMouseDown,
  onArtistClick,
  downloadProgress,
  subtitleSlot,
  isLiked,
}: TrackRowContentProps) {
  const showProgress = downloadProgress && downloadProgress.progress > 0;

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onMouseDown={onMouseDown} onClick={onPlayPause}>
      <PlayOverlay
        onPlay={onPlayPause}
        onPause={onPlayPause}
        isActive={isCurrentlyPlaying}
        isPlaying={isCurrentlyPlaying && isPlayerPlaying}
        forceShow={isRowHovered}
        className="w-8 h-8 shrink-0"
      >
        <div className="w-8 h-8 rounded bg-muted overflow-hidden">
          {artworkUrl ? (
            <img src={artworkUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Music className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </PlayOverlay>
      <TrackRowCore
        title={track.title}
        isCurrent={isCurrentlyPlaying}
        artistPrefix={isLiked && <Heart className="h-3 w-3 shrink-0 fill-primary text-primary" aria-hidden="true" />}
        artist={
          onArtistClick ? (
            <Button
              variant="ghost"
              className="text-xs text-muted-foreground truncate hover:text-foreground hover:bg-transparent h-auto p-0 block max-w-full text-left"
              onClick={(e) => {
                e.stopPropagation();
                onArtistClick();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {track.user.username}
            </Button>
          ) : (
            track.user.username
          )
        }
        subtitleSlot={subtitleSlot}
      >
        {showProgress && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.progress * 100}%` }}
              />
            </div>
            {downloadProgress.downloadedBytes != null && downloadProgress.totalBytes != null && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes)}
              </span>
            )}
          </div>
        )}
      </TrackRowCore>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatDuration(track.duration)}</span>
    </div>
  );
}
