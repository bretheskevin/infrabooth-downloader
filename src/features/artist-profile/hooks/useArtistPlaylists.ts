import { useCallback } from 'react';
import { api } from '@/lib/tauri';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';
import { useStreamedUserQuery } from '@/hooks/useStreamedUserQuery';
import type { ArtistPlaylist, ArtistPlaylistsBatchEvent } from '@/bindings';

export function useArtistPlaylists(artistId: number | null) {
  const getPlaylistsFromEvent = useCallback(
    (payload: unknown) => {
      const event = payload as ArtistPlaylistsBatchEvent;
      return event.entityId === artistId ? event.playlists : [];
    },
    [artistId]
  );

  return useStreamedUserQuery<ArtistPlaylist>({
    eventName: 'artist-playlists-batch',
    queryKey: ['artist-playlists', artistId],
    queryFn: () => api.getArtistPlaylists(artistId!),
    getItemsFromEvent: getPlaylistsFromEvent,
    enabled: artistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
