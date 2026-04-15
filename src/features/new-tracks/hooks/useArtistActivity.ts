import { useCallback } from 'react';
import { api } from '@/lib/tauri';
import { useMarkSeenQuery } from '@/hooks/useMarkSeenQuery';

export function useArtistActivity(artistId: number | undefined) {
  const updateArtist = useCallback(
    (a: import('@/bindings').FollowedArtist) => ({ ...a, has_new_content: false, has_new_original_tracks: false }),
    [],
  );

  return useMarkSeenQuery({
    artistId,
    queryKey: 'artist-activity',
    fetchFn: api.getArtistActivity,
    markSeenFn: api.markArtistSeen,
    updateArtist,
  });
}
