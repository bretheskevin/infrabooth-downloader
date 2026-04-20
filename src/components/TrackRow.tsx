import { useState, useCallback, useMemo } from 'react';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useTrackActions } from '@/hooks/useTrackActions';
import { useLikeTrack } from '@/hooks/useLikeTrack';
import { useMenuExclusivity } from '@/hooks/useMenuExclusivity';
import { useIsSignedIn } from '@/features/auth/store';
import { usePlayerStore, buildPlaybackQueue } from '@/features/player';
import { TrackRowContent } from '@/components/TrackRowContent';
import { TrackRowActionsContextContent, TrackRowActionsDropdown } from '@/components/TrackRowActions';
import { useArtistProfileStore } from '@/features/artist-profile';
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
  downloadState?: DownloadState;
  subtitleSlot?: React.ReactNode;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onMouseDown?: () => void;
  onRemoveFromPlaylist?: () => void;
  onOpenFileLocation?: () => void;
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
  subtitleSlot,
  onHoverStart,
  onHoverEnd,
  onMouseDown,
  onRemoveFromPlaylist,
  onOpenFileLocation,
}: TrackRowProps) {
  const [isRowHovered, setIsRowHovered] = useState(false);
  const [contextMenuKey, setContextMenuKey] = useState(0);
  const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false);

  const dismissSelf = useCallback(() => {
    setDropdownMenuOpen(false);
    setContextMenuKey((k) => k + 1);
  }, []);

  const claimMenu = useMenuExclusivity(dismissSelf);

  const handleDropdownMenuOpenChange = useCallback(
    (open: boolean) => {
      if (open) claimMenu();
      setDropdownMenuOpen(open);
    },
    [claimMenu],
  );

  const handleContextMenuOpenChange = useCallback(
    (open: boolean) => {
      if (open) claimMenu();
    },
    [claimMenu],
  );
  const { handleCopyLink, handleOpenInBrowser } = useTrackActions(track.permalink_url);
  const likeState = useLikeTrack(track);
  const isSignedIn = useIsSignedIn();
  const handleAddToQueue = useCallback(() => {
    const [item] = buildPlaybackQueue([track]);
    if (item) usePlayerStore.getState().addToQueue(item);
  }, [track]);

  const handleArtistClick = useCallback(() => {
    useArtistProfileStore.getState().openProfile(track.user.id, track.user.username);
  }, [track.user.id, track.user.username]);

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
    <ContextMenu key={contextMenuKey} onOpenChange={handleContextMenuOpenChange}>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group flex items-center gap-3 px-3 py-2 rounded-md',
            isCurrentlyPlaying && 'bg-primary/5',
            downloadState?.status === 'completed' && 'opacity-60',
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
            onArtistClick={track.user.id > 0 ? handleArtistClick : undefined}
            downloadProgress={downloadProgress}
            subtitleSlot={subtitleSlot}
            isLiked={likeState?.isLiked}
          />
          <TrackRowActionsDropdown
            onCopyLink={handleCopyLink}
            onOpenInBrowser={handleOpenInBrowser}
            onOpenFileLocation={onOpenFileLocation}
            isSignedIn={isSignedIn}
            trackId={track.id}
            dropdownMenuOpen={dropdownMenuOpen}
            onDropdownMenuOpenChange={handleDropdownMenuOpenChange}
            actionSlot={actionSlot}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            onAddToQueue={handleAddToQueue}
            likeState={likeState}
          />
        </div>
      </ContextMenuTrigger>
      <TrackRowActionsContextContent
        onCopyLink={handleCopyLink}
        onOpenInBrowser={handleOpenInBrowser}
        onOpenFileLocation={onOpenFileLocation}
        isSignedIn={isSignedIn}
        trackId={track.id}
        onCloseMenu={() => setContextMenuKey((k) => k + 1)}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
        onAddToQueue={handleAddToQueue}
        likeState={likeState}
      />
    </ContextMenu>
  );
}
