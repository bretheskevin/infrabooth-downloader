import { useCallback } from 'react';
import { api } from '@/lib/tauri';
import { useMarkSeenQuery } from '@/hooks/useMarkSeenQuery';

export function useArtistReleases(artistId: number | undefined) {
  const updateArtist = useCallback(
    (a: import('@/bindings').FollowedArtist) => ({ ...a, has_new_releases: false, has_new_original_releases: false }),
    [],
  );

  return useMarkSeenQuery({
    artistId,
    queryKey: 'artist-releases',
    fetchFn: api.getArtistReleases,
    markSeenFn: api.markArtistReleasesSeen,
    updateArtist,
  });
}
