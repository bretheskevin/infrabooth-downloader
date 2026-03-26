import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { useIsSignedIn } from '@/features/auth/store';
import { STALE_TIME } from '../constants';

export function useFollowedArtists() {
  const isSignedIn = useIsSignedIn();

  const query = useQuery({
    queryKey: ['followed-artists'],
    queryFn: async () => {
      void logger.info('[new-tracks] Fetching followed artists...');
      const result = await api.getFollowedArtists();
      void logger.info(`[new-tracks] Fetched ${result.length} artists, ${result.filter(a => a.has_new_content).length} with new content`);
      return result;
    },
    enabled: isSignedIn,
    staleTime: STALE_TIME,
    retry: false,
  });

  const artists = query.data ?? [];

  return {
    artists,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
