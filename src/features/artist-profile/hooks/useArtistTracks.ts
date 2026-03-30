import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 20;

export function useArtistTracks(artistId: number | null) {
  return useInfiniteQuery({
    queryKey: ['artist-tracks', artistId],
    queryFn: async ({ pageParam = 0 }) => {
      void logger.debug(`[artist] Fetching tracks: artistId=${artistId}, offset=${pageParam}`);
      const result = await api.getArtistTracks(artistId!, PAGE_SIZE, pageParam);
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
