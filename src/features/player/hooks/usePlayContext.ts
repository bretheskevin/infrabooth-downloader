import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { usePlayerStore } from '../store';
import { buildPlaybackQueue } from '../utils/buildPlaybackQueue';

export function usePlayContext(tracks: TrackInfo[]) {
  const playTrack = useCallback(
    (index: number) => {
      const track = tracks[index];
      if (!track) return;
      void usePlayerStore.getState().play(buildPlaybackQueue(tracks), index);
    },
    [tracks],
  );

  const syncQueue = useCallback(() => {
    const queue = buildPlaybackQueue(tracks);
    usePlayerStore.getState().syncQueue(queue);
  }, [tracks]);

  const playShuffled = useCallback(() => {
    void usePlayerStore.getState().playShuffled(buildPlaybackQueue(tracks));
  }, [tracks]);

  return { playTrack, syncQueue, playShuffled };
}
