import { api } from '@/lib/tauri';
import { useStreamedQuery } from '@/hooks/useStreamedQuery';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';
import type { TrackInfo } from '@/bindings';

export function usePlaylistTracks(playlistId: number, secretToken?: string | null, initialTracks?: TrackInfo[]) {
  return useStreamedQuery({
    eventName: 'playlist-tracks-batch',
    entityId: playlistId,
    queryKey: ['playlist-tracks', playlistId],
    queryFn: () => api.getPlaylistTracks(playlistId, secretToken ?? null),
    initialData: initialTracks,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
