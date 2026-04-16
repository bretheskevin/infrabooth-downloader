import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import { api } from '@/lib/tauri';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';

export function useArtistPlaylistTracks(playlistId: number | null, secretToken?: string | null) {
  return useStreamedQuery({
    eventName: 'artist-playlist-tracks-batch',
    entityId: playlistId,
    queryKey: ['artist-playlist-tracks', playlistId, secretToken ?? null],
    queryFn: () => api.getArtistPlaylistTracks(playlistId!, secretToken ?? null),
    enabled: playlistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
