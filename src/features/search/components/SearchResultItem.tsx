import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { getArtworkUrl } from '@/lib/utils';
import { TrackRow } from '@/components/TrackRow';
import { TrackDownloadAction } from '@/components/TrackDownloadAction';
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
}

export function SearchResultItem({
  track, state, onDownload, onRetry,
  index, onPlay, onPause, onResume,
  isCurrentlyPlaying = false, isPlayerPlaying = false,
}: SearchResultItemProps) {
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
      rightSlot={
        <TrackDownloadAction
          state={state}
          onDownload={onDownload}
          onRetry={onRetry}
          variant="filled"
        />
      }
    />
  );
}
