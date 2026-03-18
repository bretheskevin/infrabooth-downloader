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
  const play = usePlayerStore((s) => s.play);

  const playTrack = useCallback(
    (index: number) => {
      const queue = buildPlaybackQueue(tracks);
      play(queue, index);
    },
    [tracks, play],
  );

  return { playTrack };
}
