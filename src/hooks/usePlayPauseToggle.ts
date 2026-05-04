import { useCallback } from 'react';

interface UsePlayPauseToggleParams {
  isCurrentlyPlaying: boolean;
  isPlayerPlaying: boolean;
  onPlay?: (index: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  index: number;
}

export function usePlayPauseToggle({ isCurrentlyPlaying, isPlayerPlaying, onPlay, onPause, onResume, index }: UsePlayPauseToggleParams) {
  return useCallback(() => {
    if (isCurrentlyPlaying && isPlayerPlaying) {
      onPause?.();
    } else if (isCurrentlyPlaying && !isPlayerPlaying) {
      onResume?.();
    } else {
      onPlay?.(index);
    }
  }, [isCurrentlyPlaying, isPlayerPlaying, onPause, onResume, onPlay, index]);
}
