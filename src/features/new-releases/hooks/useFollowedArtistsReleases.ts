import { useMemo } from 'react';
import { useFollowedArtists } from '@/hooks/useFollowedArtists';

export function useFollowedArtistsReleases() {
  const { artists: allArtists, ...rest } = useFollowedArtists();

  const artists = useMemo(
    () => allArtists.filter((a) => a.has_new_releases || a.has_original_releases),
    [allArtists],
  );

  return { artists, ...rest };
}
