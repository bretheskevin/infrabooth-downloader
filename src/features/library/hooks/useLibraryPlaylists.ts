import { useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useStreamedUserQuery } from '@/hooks/useStreamedUserQuery';
import { api } from '@/lib/tauri';
import type { LibraryPlaylist, LibraryPlaylistsBatchEvent } from '@/bindings';

export function useLibraryPlaylists(enabled: boolean) {
  const username = useAuthStore((s) => s.username);

  const getPlaylistsFromEvent = useCallback(
    (payload: unknown) => (payload as LibraryPlaylistsBatchEvent).playlists,
    []
  );

  const query = useStreamedUserQuery<LibraryPlaylist>({
    eventName: 'library-playlists-batch',
    queryKey: ['library-playlists', username],
    queryFn: api.getLibraryPlaylists,
    getItemsFromEvent: getPlaylistsFromEvent,
    enabled,
  });

  const clearCache = useCallback(async () => {
    await api.clearLibraryCache();
  }, []);

  return {
    playlists: query.data ?? [],
    isLoading: query.isLoading,
    isStreaming: query.isStreaming,
    error: query.error,
    refetch: query.refetch,
    clearCache,
  };
}
