import { useMemo } from 'react';
import { useQueueStore } from '@/features/queue/store';
import type { FailedTrack } from '@/features/queue/types/download';

export function useFailedTracks(): FailedTrack[] {
  const tracks = useQueueStore((state) => state.tracks);

  return useMemo(() => {
    return tracks
      .filter((track) => track.status === 'failed' && track.error)
      .map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        error: track.error!,
      }));
  }, [tracks]);
}
