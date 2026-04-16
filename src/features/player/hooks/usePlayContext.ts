import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { usePlayerStore } from '../store';
import { buildPlaybackQueue } from '../utils/buildPlaybackQueue';

export function usePlayContext(tracks: TrackInfo[]) {
  const playTrack = useCallback(
    (index: number) => {
      const track = tracks[index];
      if (!track) return;

      const { queue, skipTo, play } = usePlayerStore.getState();
      const queueIndex = queue.findIndex((q) => q.trackId === track.id);

      if (queueIndex !== -1) {
        void skipTo(queueIndex);
      } else {
        void play(buildPlaybackQueue(tracks), index);
      }
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
