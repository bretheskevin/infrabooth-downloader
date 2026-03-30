import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import type { SortOption } from '@/bindings';

const PAGE_SIZE = 20;

export function useArtistTracks(artistId: number | null, sort: SortOption) {
  return useInfiniteQuery({
    queryKey: ['artist-tracks', artistId, sort],
    queryFn: async ({ pageParam = 0 }) => {
      void logger.debug(`[artist] Fetching tracks: artistId=${artistId}, sort=${sort}, offset=${pageParam}`);
      const result = await api.getArtistTracks(artistId!, sort, PAGE_SIZE, pageParam);
      void logger.debug(`[artist] Got ${result.tracks.length} tracks, has_more=${result.has_more}`);
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      return lastPage.next_offset;
    },
    enabled: artistId !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
