import { useCallback } from 'react';
import { preloadOnHover, preloadImmediate } from '@/features/player/url-cache';

export function useTrackPreloadHandlers() {
  const handlePreloadOnHover = useCallback(
    (track: { id: number; permalink_url: string }) =>
      preloadOnHover(track.id, track.permalink_url),
    [],
  );

  const handlePreloadImmediate = useCallback(
    (track: { id: number; permalink_url: string }) =>
      preloadImmediate(track.id, track.permalink_url),
    [],
  );

  return { handlePreloadOnHover, handlePreloadImmediate };
}
