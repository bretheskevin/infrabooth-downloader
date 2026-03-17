import { useCallback } from 'react';
import type { TrackInfo } from '@/bindings';
import { preloadPlaybackUrls } from '../url-cache';

export function usePreloadPlaybackUrls(tracks: TrackInfo[]) {
  return useCallback(
    (startIndex: number, endIndex: number) => {
      const visible = tracks.slice(startIndex, endIndex + 1);
      if (visible.length === 0) return;
      const items = visible.map((t) => ({ trackId: t.id, trackUrl: t.permalink_url }));
      preloadPlaybackUrls(items);
    },
    [tracks],
  );
}
