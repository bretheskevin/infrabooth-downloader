import { api } from '@/lib/tauri';
import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import type { SortOption } from '@/bindings';

export function useArtistTracks(artistId: number | null, sort: SortOption) {
  return useStreamedQuery({
    eventName: 'artist-tracks-batch',
    entityId: artistId,
    queryKey: ['artist-tracks', artistId, sort],
    queryFn: () => api.getAllArtistTracks(artistId!, sort),
    enabled: artistId !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
