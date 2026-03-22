import { memo, useCallback } from 'react';
import { usePlayPauseToggle } from '@/hooks/usePlayPauseToggle';
import { Checkbox } from '@/components/ui/checkbox';
import { TrackRow } from '@/components/TrackRow';
import { TrackDownloadAction } from '@/components/TrackDownloadAction';
import { EqualizerBars } from '@/features/player/components/EqualizerBars';
import { useHoverPreload } from '@/hooks/useHoverPreload';
import { cn } from '@/lib/utils';
import type { TrackInfo } from '@/bindings';
import type { DownloadState } from '@/types/download';

interface PlaylistTrackItemProps {
  track: TrackInfo;
  index: number;
  staggerIndex: number;
  animate?: boolean;
  isSelected: boolean;
  onToggle: (id: number) => void;
  downloadState: DownloadState;
  onDownload: (track: TrackInfo) => void;
  onPlay?: (index: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  isCurrentlyPlaying?: boolean;
  isPlayerPlaying?: boolean;
  onHoverTrack?: (track: TrackInfo) => (() => void) | undefined;
  onMouseDownTrack?: (track: TrackInfo) => void;
  isDownloadEnabled: boolean;
  onRemoveFromPlaylist?: () => void;
}

const MAX_STAGGER_ITEMS = 15;
const STAGGER_DELAY_MS = 25;

export const PlaylistTrackItem = memo(function PlaylistTrackItem({
  track,
  index,
  staggerIndex,
  animate = true,
  isSelected,
  onToggle,
  downloadState,
  onDownload,
  onPlay,
  onPause,
  onResume,
  isCurrentlyPlaying = false,
  isPlayerPlaying = false,
  onHoverTrack,
  onMouseDownTrack,
  isDownloadEnabled,
  onRemoveFromPlaylist,
}: PlaylistTrackItemProps) {
  const delay = animate && staggerIndex < MAX_STAGGER_ITEMS ? staggerIndex * STAGGER_DELAY_MS : 0;
  const isDownloaded = downloadState.status === 'completed';

  const boundHover = useCallback(() => onHoverTrack?.(track), [onHoverTrack, track]);
  const { onHoverStart, onHoverEnd } = useHoverPreload(boundHover);
  const handleMouseDown = useCallback(() => onMouseDownTrack?.(track), [onMouseDownTrack, track]);

  const handleToggle = useCallback(() => onToggle(track.id), [onToggle, track.id]);
  const handleDownload = useCallback(() => onDownload(track), [onDownload, track]);
  const handlePlayPause = usePlayPauseToggle({
    isCurrentlyPlaying, isPlayerPlaying, onPlay, onPause, onResume, index,
  });

  return (
    <TrackRow
      track={track}
      isCurrentlyPlaying={isCurrentlyPlaying}
      isPlayerPlaying={isPlayerPlaying}
      onPlayPause={handlePlayPause}
      artworkUrl={track.artwork_url ?? null}
      animationDelay={delay}
      className={cn(
        'group border transition-[background-color,border-color] duration-150',
        animate && 'track-row-stagger',
        isSelected
          ? 'bg-primary/5 border-primary/20'
          : isCurrentlyPlaying
            ? 'border-transparent'
            : 'border-transparent hover:bg-muted/50',
      )}
      downloadState={downloadState}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onMouseDown={handleMouseDown}
      leftSlot={
        <div
          className={cn(
            'flex items-center gap-3 shrink-0 self-stretch -my-2 py-2 -ml-3 pl-3',
            isDownloadEnabled && !isDownloaded && 'cursor-pointer',
          )}
          onClick={isDownloadEnabled ? handleToggle : undefined}
        >
          {isDownloadEnabled && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleToggle}
              disabled={isDownloaded}
              className="shrink-0"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          )}
          <span className="w-6 text-right text-xs text-muted-foreground tabular-nums shrink-0">
            {isCurrentlyPlaying ? <EqualizerBars className="h-3 w-3 ml-auto" /> : index + 1}
          </span>
        </div>
      }
      actionSlot={
        isDownloadEnabled ? (
          <TrackDownloadAction
            state={downloadState}
            onDownload={handleDownload}
            onRetry={handleDownload}
            variant="ghost"
          />
        ) : undefined
      }
      onRemoveFromPlaylist={onRemoveFromPlaylist}
    />
  );
});
