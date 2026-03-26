import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import type { FollowedArtist } from '@/bindings';
import { FOLLOWED_ARTISTS_KEY, STALE_TIME } from '../constants';

export function useArtistActivity(artistId: number | undefined) {
  const queryClient = useQueryClient();
  const markedRef = useRef<number | undefined>(undefined);

  const query = useQuery({
    queryKey: ['artist-activity', artistId],
    queryFn: () => api.getArtistActivity(artistId!),
    enabled: artistId !== undefined,
    staleTime: STALE_TIME,
  });

  useEffect(() => {
    if (artistId !== undefined && query.data && markedRef.current !== artistId) {
      markedRef.current = artistId;
      void api.markArtistSeen(artistId);
      queryClient.setQueryData<FollowedArtist[]>([...FOLLOWED_ARTISTS_KEY], (prev) => {
        if (!prev) return prev;
        return prev.map((a) => (a.id === artistId ? { ...a, has_new_content: false } : a));
      });
    }
  }, [artistId, query.data, queryClient]);

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
