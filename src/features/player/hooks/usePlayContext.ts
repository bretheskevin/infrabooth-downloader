import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { TrackInfo } from '@/bindings';
import { usePlayerStore } from '../store';
import { preloadPlaybackUrls } from '../url-cache';
import type { PlaybackItem } from '../types';

export function buildPlaybackQueue(tracks: TrackInfo[]): PlaybackItem[] {
  return tracks.map((track) => ({
    trackId: track.id,
    trackUrl: track.permalink_url,
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url,
    durationMs: track.duration,
  }));
}

export function usePlayContext(tracks: TrackInfo[]) {
  const play = usePlayerStore((s) => s.play);
  const lastPreloadKey = useRef<string | null>(null);

  // Stable identity for the track list based on IDs
  const trackKey = useMemo(
    () => tracks.map((t) => t.id).join(','),
    [tracks],
  );

  // Preload playback URLs when track list changes
  useEffect(() => {
    if (tracks.length === 0 || trackKey === lastPreloadKey.current) return;
    lastPreloadKey.current = trackKey;

    const items = tracks.map((t) => ({ trackId: t.id, trackUrl: t.permalink_url }));
    preloadPlaybackUrls(items);
  }, [tracks, trackKey]);

  const playTrack = useCallback(
    (index: number) => {
      const queue = buildPlaybackQueue(tracks);
      play(queue, index);
    },
    [tracks, play],
  );

  return { playTrack };
}
