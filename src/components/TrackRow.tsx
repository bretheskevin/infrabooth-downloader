import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban } from 'lucide-react';
import { Menu, MenuTrigger } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { useLikeTrack } from '@/hooks/useLikeTrack';
import { useMenuExclusivity } from '@/hooks/useMenuExclusivity';
import { TrackRowContent } from '@/components/TrackRowContent';
import { TrackRowActionsContextContent, TrackRowActionsDropdown } from '@/components/TrackRowActions';
import { useArtistProfileStore } from '@/features/artist-profile';
import { useTrackExclusion } from '@/features/rekordbox-export/hooks/useTrackExclusion';
import type { TrackInfo } from '@/bindings';
import type { DownloadState } from '@/types/download';

export interface TrackRowPlayback {
  isCurrent?: boolean;
  isPlaying?: boolean;
  onToggle: () => void;
}

export interface TrackRowSlots {
  left?: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export interface TrackRowInteractions {
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onMouseDown?: () => void;
}

interface TrackRowProps {
  track: TrackInfo;
  artworkUrl: string | null;
  downloadState?: DownloadState;
  animationDelay?: number;
  className?: string;
  playback: TrackRowPlayback;
  slots?: TrackRowSlots;
  interactions?: TrackRowInteractions;
}

export function TrackRow({
  track,
  artworkUrl,
  animationDelay,
  className,
  downloadState,
  playback: { isCurrent = false, isPlaying = false, onToggle },
  slots: { left, action, subtitle } = {},
  interactions: { onHoverStart, onHoverEnd, onMouseDown } = {},
}: TrackRowProps) {
  const { t } = useTranslation();
  const [isRowHovered, setIsRowHovered] = useState(false);
  const [contextMenuKey, setContextMenuKey] = useState(0);
  const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false);

  const { isExcluded } = useTrackExclusion(track.id);

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
  const likeState = useLikeTrack(track);

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
    <Menu variant="context" key={contextMenuKey} onOpenChange={handleContextMenuOpenChange}>
      <MenuTrigger asChild>
        <div
          className={cn(
            'group flex items-center gap-3 px-3 py-2 rounded-md',
            isCurrent && 'bg-primary/5',
            (downloadState?.status === 'completed' || isExcluded) && 'opacity-60',
            className,
          )}
          style={animationDelay && animationDelay > 0 ? { animationDelay: `${animationDelay}ms` } : undefined}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {left}
          <TrackRowContent
            track={track}
            artworkUrl={artworkUrl}
            isCurrentlyPlaying={isCurrent}
            isPlayerPlaying={isPlaying}
            isRowHovered={isRowHovered}
            onPlayPause={onToggle}
            onMouseDown={handleContentMouseDown}
            onArtistClick={track.user.id > 0 ? handleArtistClick : undefined}
            downloadProgress={downloadProgress}
            subtitleSlot={subtitle}
            isLiked={likeState?.isLiked}
          />
          {isExcluded && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              <Ban className="h-3 w-3" />
              {t('rekordboxExport.excludedBadge')}
            </span>
          )}
          <TrackRowActionsDropdown
            track={track}
            dropdownMenuOpen={dropdownMenuOpen}
            onDropdownMenuOpenChange={handleDropdownMenuOpenChange}
            actionSlot={action}
            likeState={likeState}
          />
        </div>
      </MenuTrigger>
      <TrackRowActionsContextContent track={track} onCloseMenu={() => setContextMenuKey((k) => k + 1)} likeState={likeState} />
    </Menu>
  );
}
