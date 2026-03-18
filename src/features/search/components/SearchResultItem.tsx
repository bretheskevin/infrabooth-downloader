import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { getArtworkUrl } from '@/lib/utils';
import { TrackRow } from '@/components/TrackRow';
import { TrackDownloadAction } from '@/components/TrackDownloadAction';
import { useHoverPreload } from '@/hooks/useHoverPreload';
import type { DownloadState } from '@/types/download';

interface SearchResultItemProps {
  track: TrackInfo;
  index: number;
  state: DownloadState;
  onDownload: () => void;
  onRetry: () => void;
  onPlay?: (index: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  isCurrentlyPlaying?: boolean;
  isPlayerPlaying?: boolean;
  onHoverTrack?: (track: TrackInfo) => (() => void) | undefined;
  onMouseDownTrack?: (track: TrackInfo) => void;
  isDownloadEnabled: boolean;
}

export function SearchResultItem({
  track, state, onDownload, onRetry,
  index, onPlay, onPause, onResume,
  isCurrentlyPlaying = false, isPlayerPlaying = false,
  onHoverTrack, onMouseDownTrack,
  isDownloadEnabled,
}: SearchResultItemProps) {
  const boundHover = useCallback(() => onHoverTrack?.(track), [onHoverTrack, track]);
  const { onHoverStart, onHoverEnd } = useHoverPreload(boundHover);
  const handleMouseDown = useCallback(() => onMouseDownTrack?.(track), [onMouseDownTrack, track]);

  const handlePlayPause = useCallback(() => {
    if (isCurrentlyPlaying && isPlayerPlaying) {
      onPause?.();
    } else if (isCurrentlyPlaying && !isPlayerPlaying) {
      onResume?.();
    } else {
      onPlay?.(index);
    }
  }, [isCurrentlyPlaying, isPlayerPlaying, onPause, onResume, onPlay, index]);

  return (
    <TrackRow
      track={track}
      isCurrentlyPlaying={isCurrentlyPlaying}
      isPlayerPlaying={isPlayerPlaying}
      onPlayPause={handlePlayPause}
      artworkUrl={getArtworkUrl(track.artwork_url) ?? null}
      className="border-b border-border/50 last:border-b-0"
      downloadState={state}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onMouseDown={handleMouseDown}
      rightSlot={
        isDownloadEnabled ? (
          <TrackDownloadAction
            state={state}
            onDownload={onDownload}
            onRetry={onRetry}
            variant="filled"
          />
        ) : null
      }
    />
  );
}
