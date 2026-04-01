import { api } from '@/lib/tauri';
import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import type { TrackInfo } from '@/bindings';

export function usePlaylistTracks(playlistId: number, initialTracks?: TrackInfo[]) {
  return useStreamedQuery({
    eventName: 'playlist-tracks-batch',
    entityId: playlistId,
    queryKey: ['playlist-tracks', playlistId],
    queryFn: () => api.getLibraryPlaylistTracks(playlistId),
    initialData: initialTracks,
  });
}
