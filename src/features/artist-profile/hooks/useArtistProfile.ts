import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';

export function useArtistProfile(artistId: number | null) {
  return useQuery({
    queryKey: ['artist-profile', artistId],
    queryFn: () => api.getArtistProfile(artistId!),
    enabled: artistId !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
