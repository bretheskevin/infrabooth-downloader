import { useCallback } from 'react';
import { api } from '@/lib/tauri';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';
import { useStreamedUserQuery } from '@/hooks/useStreamedUserQuery';
import type { ArtistPlaylist, ArtistAlbumsBatchEvent } from '@/bindings';

export function useArtistAlbums(artistId: number | null) {
  const getAlbumsFromEvent = useCallback(
    (payload: unknown) => {
      const event = payload as ArtistAlbumsBatchEvent;
      return event.entityId === artistId ? event.albums : [];
    },
    [artistId],
  );

  return useStreamedUserQuery<ArtistPlaylist>({
    eventName: 'artist-albums-batch',
    queryKey: ['artist-albums', artistId],
    queryFn: () => api.getArtistAlbums(artistId!),
    getItemsFromEvent: getAlbumsFromEvent,
    enabled: artistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
