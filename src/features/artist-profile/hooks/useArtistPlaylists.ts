import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';

export function useArtistPlaylists(artistId: number | null) {
  return useQuery({
    queryKey: ['artist-playlists', artistId],
    queryFn: () => api.getArtistPlaylists(artistId!),
    enabled: artistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
