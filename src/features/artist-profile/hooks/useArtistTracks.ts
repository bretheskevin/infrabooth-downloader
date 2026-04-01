import { api } from '@/lib/tauri';
import { useStreamedQuery } from '@/hooks/useStreamedQuery';

export function useArtistTracks(artistId: number | null) {
  return useStreamedQuery({
    eventName: 'artist-tracks-batch',
    entityId: artistId,
    queryKey: ['artist-tracks', artistId],
    queryFn: () => api.getAllArtistTracks(artistId!),
    enabled: artistId !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
