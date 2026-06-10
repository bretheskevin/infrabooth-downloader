import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { useIsSignedIn } from '@/features/auth/store';
import { FOLLOWED_ARTISTS_KEY, DEFAULT_STALE_TIME, refreshFollowedArtists } from '@/lib/query';
import { api } from '@/lib/tauri';

export function useFollowedArtists() {
  const isSignedIn = useIsSignedIn();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...FOLLOWED_ARTISTS_KEY],
    queryFn: async () => {
      void logger.info('[new-tracks] Fetching followed artists...');
      const result = await api.getFollowedArtists();
      void logger.info(`[new-tracks] Fetched ${result.length} artists, ${result.filter((a) => a.has_new_content).length} with new content`);
      return result;
    },
    enabled: isSignedIn,
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  });

  const artists = query.data ?? [];

  const refresh = useCallback(async () => {
    try {
      await refreshFollowedArtists(queryClient);
    } catch (error) {
      void logger.error(`[new-tracks] Failed to refresh followed artists: ${error}`);
    }
  }, [queryClient]);

  return {
    artists,
    isLoading: query.isLoading,
    error: query.error,
    refresh,
  };
}
