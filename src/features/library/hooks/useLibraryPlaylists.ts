import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { api } from '@/lib/tauri';

export function useLibraryPlaylists(enabled: boolean) {
  const username = useAuthStore((s) => s.username);

  const query = useQuery({
    queryKey: ['library-playlists', username],
    queryFn: api.getLibraryPlaylists,
    enabled,
    staleTime: Infinity,
  });

  const clearCache = useCallback(async () => {
    await api.clearLibraryCache();
  }, []);

  return {
    playlists: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    clearCache,
  };
}
