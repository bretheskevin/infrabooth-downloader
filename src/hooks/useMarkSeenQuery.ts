import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FollowedArtist } from '@/bindings';
import { FOLLOWED_ARTISTS_KEY, DEFAULT_STALE_TIME } from '@/lib/query';

interface MarkSeenQueryOptions<T> {
  artistId: number | undefined;
  queryKey: string;
  fetchFn: (id: number) => Promise<T[]>;
  /** Must be a stable reference (e.g. module-level fn or wrapped in useCallback) to avoid infinite effect loops. */
  markSeenFn: (id: number) => Promise<void>;
  /** Must be a stable reference (e.g. wrapped in useCallback with [] deps) to avoid infinite effect loops. */
  updateArtist: (artist: FollowedArtist) => FollowedArtist;
}

export function useMarkSeenQuery<T>({
  artistId,
  queryKey,
  fetchFn,
  markSeenFn,
  updateArtist,
}: MarkSeenQueryOptions<T>) {
  const queryClient = useQueryClient();
  const markedRef = useRef<number | undefined>(undefined);

  const query = useQuery({
    queryKey: [queryKey, artistId],
    queryFn: () => fetchFn(artistId!),
    enabled: artistId !== undefined,
    staleTime: DEFAULT_STALE_TIME,
  });

  useEffect(() => {
    if (artistId !== undefined && query.data && markedRef.current !== artistId) {
      markedRef.current = artistId;
      void markSeenFn(artistId);
      queryClient.setQueryData<FollowedArtist[]>([...FOLLOWED_ARTISTS_KEY], (prev) => {
        if (!prev) return prev;
        return prev.map((a) => (a.id === artistId ? updateArtist(a) : a));
      });
    }
  }, [artistId, query.data, queryClient, markSeenFn, updateArtist]);

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
