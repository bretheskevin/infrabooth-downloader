import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { FOLLOWED_ARTISTS_AUTO_REFRESH_MS, refreshFollowedArtists } from '@/lib/query';

export function useAutoRefreshFollowedArtists(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      void refreshFollowedArtists(queryClient).catch((error) =>
        logger.error(`[new-tracks] Hourly auto-refresh failed: ${error}`),
      );
    }, FOLLOWED_ARTISTS_AUTO_REFRESH_MS);

    return () => clearInterval(interval);
  }, [enabled, queryClient]);
}
