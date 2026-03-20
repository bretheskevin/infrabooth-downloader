import { useState, useCallback } from 'react';
import { Music, Link, ExternalLink, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlayOverlay } from '@/features/player';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDuration, formatBytes } from '@/lib/utils';
import { useTrackActions } from '@/hooks/useTrackActions';
import { useIsSignedIn } from '@/features/auth/store';
import { PlaylistPickerSubmenu } from '@/components/PlaylistPickerSubmenu';
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
  actionSlot?: React.ReactNode;
  downloadState: DownloadState;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onMouseDown?: () => void;
}

interface TrackMenuItemsProps {
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  isSignedIn: boolean;
  trackId: number;
  variant: 'context' | 'dropdown';
  onCloseMenu?: () => void;
}

function TrackMenuItems({ onCopyLink, onOpenInBrowser, isSignedIn, trackId, variant, onCloseMenu }: TrackMenuItemsProps) {
  const { t } = useTranslation();

  if (variant === 'context') {
    return (
      <>
        <ContextMenuItem onClick={onCopyLink}>
          <Link className="mr-2 h-4 w-4" />
          {t('trackMenu.copyLink')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onOpenInBrowser}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('trackMenu.openInBrowser')}
        </ContextMenuItem>
        {isSignedIn && (
          <>
            <ContextMenuSeparator />
            <PlaylistPickerSubmenu trackId={trackId} variant="context" onSuccess={onCloseMenu} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <DropdownMenuItem onClick={onCopyLink}>
        <Link className="mr-2 h-4 w-4" />
        {t('trackMenu.copyLink')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onOpenInBrowser}>
        <ExternalLink className="mr-2 h-4 w-4" />
        {t('trackMenu.openInBrowser')}
      </DropdownMenuItem>
      {isSignedIn && (
        <>
          <DropdownMenuSeparator />
          <PlaylistPickerSubmenu trackId={trackId} variant="dropdown" onSuccess={onCloseMenu} />
        </>
      )}
    </>
  );
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
  actionSlot,
  downloadState,
  onHoverStart,
  onHoverEnd,
  onMouseDown,
}: TrackRowProps) {
  const [isRowHovered, setIsRowHovered] = useState(false);
  const [contextMenuKey, setContextMenuKey] = useState(0);
  const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false);
  const { handleCopyLink, handleOpenInBrowser } = useTrackActions(track.permalink_url);
  const isSignedIn = useIsSignedIn();

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
    <ContextMenu key={contextMenuKey}>
      <ContextMenuTrigger asChild>
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
          <div className="flex-shrink-0 flex items-center justify-end gap-1 min-w-[32px]">
            {actionSlot}
            <DropdownMenu open={dropdownMenuOpen} onOpenChange={setDropdownMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <TrackMenuItems
                  onCopyLink={handleCopyLink}
                  onOpenInBrowser={handleOpenInBrowser}
                  isSignedIn={isSignedIn}
                  trackId={track.id}
                  variant="dropdown"
                  onCloseMenu={() => setDropdownMenuOpen(false)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <TrackMenuItems
          onCopyLink={handleCopyLink}
          onOpenInBrowser={handleOpenInBrowser}
          isSignedIn={isSignedIn}
          trackId={track.id}
          variant="context"
          onCloseMenu={() => setContextMenuKey((k) => k + 1)}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
