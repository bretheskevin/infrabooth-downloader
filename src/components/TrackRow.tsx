import { useState, useCallback } from 'react';
import { Music } from 'lucide-react';
import { PlayOverlay } from '@/features/player';
import { cn, formatDuration, formatBytes } from '@/lib/utils';
import type { TrackInfo } from '@/bindings';
import type { DownloadState } from '@/types/download';

interface TrackRowProps {
  track: TrackInfo;
  isCurrentlyPlaying?: boolean;
  isPlayerPlaying?: boolean;
  onPlayPause: () => void;
  artworkUrl: string | null;
  animationDelay?: number;
  className?: string;
  leftSlot?: React.ReactNode;
  rightSlot: React.ReactNode;
  downloadState: DownloadState;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onMouseDown?: () => void;
}

export function TrackRow({
  track,
  isCurrentlyPlaying = false,
  isPlayerPlaying = false,
  onPlayPause,
  artworkUrl,
  animationDelay,
  className,
  leftSlot,
  rightSlot,
  downloadState,
  onHoverStart,
  onHoverEnd,
  onMouseDown,
}: TrackRowProps) {
  const [isRowHovered, setIsRowHovered] = useState(false);
  const handleMouseEnter = useCallback(() => {
    setIsRowHovered(true);
    onHoverStart?.();
  }, [onHoverStart]);
  const handleMouseLeave = useCallback(() => {
    setIsRowHovered(false);
    onHoverEnd?.();
  }, [onHoverEnd]);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) onMouseDown?.();
    },
    [onMouseDown],
  );

  const progress = downloadState?.status === 'downloading' ? (downloadState.progress ?? 0) : 0;
  const dlBytes = downloadState?.status === 'downloading' ? (downloadState.downloadedBytes ?? null) : null;
  const dlTotal = downloadState?.status === 'downloading' ? (downloadState.totalBytes ?? null) : null;
  const showProgress = progress > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md',
        isCurrentlyPlaying && 'bg-primary/5',
        downloadState.status === 'completed' && 'opacity-60',
        className,
      )}
      style={animationDelay && animationDelay > 0 ? { animationDelay: `${animationDelay}ms` } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {leftSlot}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onMouseDown={handleMouseDown}
        onClick={onPlayPause}
      >
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
              <img
                src={artworkUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Music className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </PlayOverlay>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', isCurrentlyPlaying && 'text-primary')}>
            {track.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{track.user.username}</p>
          {showProgress && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {dlBytes != null && dlTotal != null && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {formatBytes(dlBytes)} / {formatBytes(dlTotal)}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatDuration(track.duration)}
        </span>
      </div>
      <div className="flex-shrink-0 flex items-center justify-end min-w-[32px]">{rightSlot}</div>
    </div>
  );
}
