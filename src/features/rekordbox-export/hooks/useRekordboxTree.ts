import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';

export function useRekordboxTree(enabled: boolean) {
  const query = useQuery({
    queryKey: ['rekordbox-tree'],
    queryFn: () => api.getRekordboxPlaylistTree(),
    enabled,
    staleTime: 30_000,
  });
  return { ...query, retry: query.refetch };
}
