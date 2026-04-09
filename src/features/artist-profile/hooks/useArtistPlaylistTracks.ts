import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import { api } from '@/lib/tauri';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';

export function useArtistPlaylistTracks(playlistId: number | null) {
  return useStreamedQuery({
    eventName: 'artist-playlist-tracks-batch',
    entityId: playlistId,
    queryKey: ['artist-playlist-tracks', playlistId],
    queryFn: () => api.getArtistPlaylistTracks(playlistId!),
    enabled: playlistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
