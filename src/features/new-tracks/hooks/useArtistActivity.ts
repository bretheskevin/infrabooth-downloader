import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { STALE_TIME } from '../constants';

export function useArtistActivity(artistId: number | undefined) {
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
    }
  }, [artistId, query.data]);

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
