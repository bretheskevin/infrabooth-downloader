import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';

export function usePlaylistArtwork(
  playlistId: number,
  secretToken: string | null,
  enabled: boolean,
) {
  return useQuery<string | null>({
    queryKey: ['playlist-artwork', playlistId],
    queryFn: () => api.resolveLibraryArtwork(playlistId, secretToken),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}
