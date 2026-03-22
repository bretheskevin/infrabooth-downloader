import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { usePlayerStore } from '../store';
import type { PlaybackItem } from '../types';

export function buildPlaybackQueue(tracks: TrackInfo[]): PlaybackItem[] {
  return tracks.map((track) => ({
    trackId: track.id,
    trackUrl: track.permalink_url,
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url,
    durationMs: track.duration,
    waveformUrl: track.waveform_url,
  }));
}

export function usePlayContext(tracks: TrackInfo[]) {
  const playTrack = useCallback(
    (index: number) => {
      const track = tracks[index];
      if (!track) return;

      const { queue, skipTo, play } = usePlayerStore.getState();
      const queueIndex = queue.findIndex((q) => q.trackId === track.id);

      if (queueIndex !== -1) {
        skipTo(queueIndex);
      } else {
        play(buildPlaybackQueue(tracks), index);
      }
    },
    [tracks],
  );

  const syncQueue = useCallback(() => {
    const queue = buildPlaybackQueue(tracks);
    usePlayerStore.getState().syncQueue(queue);
  }, [tracks]);

  return { playTrack, syncQueue };
}
