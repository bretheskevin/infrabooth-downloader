import { useState, useCallback, useMemo } from 'react';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useTrackActions } from '@/hooks/useTrackActions';
import { useIsSignedIn } from '@/features/auth/store';
import { TrackRowContent } from '@/components/TrackRowContent';
import { TrackRowActionsContextContent, TrackRowActionsDropdown } from '@/components/TrackRowActions';
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
  onRemoveFromPlaylist?: () => void;
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
  onRemoveFromPlaylist,
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

  const handleContentMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) onMouseDown?.();
    },
    [onMouseDown],
  );

  const downloadProgress = useMemo(() => {
    if (downloadState?.status !== 'downloading') return null;
    return {
      progress: downloadState.progress ?? 0,
      downloadedBytes: downloadState.downloadedBytes ?? null,
      totalBytes: downloadState.totalBytes ?? null,
    };
  }, [downloadState]);

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
          <TrackRowContent
            track={track}
            artworkUrl={artworkUrl}
            isCurrentlyPlaying={isCurrentlyPlaying}
            isPlayerPlaying={isPlayerPlaying}
            isRowHovered={isRowHovered}
            onPlayPause={onPlayPause}
            onMouseDown={handleContentMouseDown}
            downloadProgress={downloadProgress}
          />
          <TrackRowActionsDropdown
            onCopyLink={handleCopyLink}
            onOpenInBrowser={handleOpenInBrowser}
            isSignedIn={isSignedIn}
            trackId={track.id}
            dropdownMenuOpen={dropdownMenuOpen}
            onDropdownMenuOpenChange={setDropdownMenuOpen}
            actionSlot={actionSlot}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
          />
        </div>
      </ContextMenuTrigger>
      <TrackRowActionsContextContent
        onCopyLink={handleCopyLink}
        onOpenInBrowser={handleOpenInBrowser}
        isSignedIn={isSignedIn}
        trackId={track.id}
        onCloseMenu={() => setContextMenuKey((k) => k + 1)}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
      />
    </ContextMenu>
  );
}
