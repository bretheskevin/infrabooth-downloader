import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '@/features/player';

export function usePlayerControls() {
  const { currentTrackId, playerState } = usePlayerStore(
    useShallow((s) => ({ currentTrackId: s.currentTrack?.trackId, playerState: s.state })),
  );

  const pause = useCallback(() => usePlayerStore.getState().pause(), []);
  const resume = useCallback(() => usePlayerStore.getState().resume(), []);

  return {
    currentTrackId,
    playerState,
    isPlaying: playerState === 'playing',
    pause,
    resume,
  };
}
