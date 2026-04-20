import { api } from '@/lib/tauri';
import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';

export function useArtistLikedTracks(artistId: number | null) {
  return useStreamedQuery({
    eventName: 'artist-liked-tracks-batch',
    entityId: artistId,
    queryKey: ['artist-liked-tracks', artistId],
    queryFn: () => api.getArtistLikedTracks(artistId!),
    enabled: artistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
