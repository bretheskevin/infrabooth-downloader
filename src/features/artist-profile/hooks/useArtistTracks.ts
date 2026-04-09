import { api } from '@/lib/tauri';
import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';
import type { SortOption } from '@/bindings';

export function useArtistTracks(artistId: number | null, sort: SortOption) {
  return useStreamedQuery({
    eventName: 'artist-tracks-batch',
    entityId: artistId,
    queryKey: ['artist-tracks', artistId, sort],
    queryFn: () => api.getAllArtistTracks(artistId!, sort),
    enabled: artistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
