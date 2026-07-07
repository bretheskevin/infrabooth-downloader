import { useCallback } from 'react';
import { resolvePlayToggle } from '@/lib/playToggle';

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
    const action = resolvePlayToggle(isCurrentlyPlaying, isPlayerPlaying);
    if (action === 'pause') onPause?.();
    else if (action === 'resume') onResume?.();
    else onPlay?.(index);
  }, [isCurrentlyPlaying, isPlayerPlaying, onPause, onResume, onPlay, index]);
}
