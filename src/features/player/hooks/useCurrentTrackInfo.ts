import { useMemo } from 'react';
import { usePlayerStore } from '../store';
import type { TrackInfo } from '@/bindings';

export function useCurrentTrackInfo(): TrackInfo | undefined {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return useMemo(() => {
    if (!currentTrack) return undefined;
    return {
      id: currentTrack.trackId,
      title: currentTrack.title,
      user: { id: currentTrack.artistId, username: currentTrack.artist, avatar_url: null },
      artwork_url: currentTrack.artworkUrl,
      duration: currentTrack.durationMs,
      permalink_url: currentTrack.trackUrl,
      waveform_url: currentTrack.waveformUrl,
      downloadable: false,
      download_url: null,
      secret_token: null,
    } satisfies TrackInfo;
  }, [currentTrack]);
}
