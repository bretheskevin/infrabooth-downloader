import { useCallback } from 'react';
import { useRemoteResource } from '@remote/lib/useRemoteResource';
import type { LibraryPlaylist } from '../utils/filterPlaylists';
import { fetchLibrary } from '../api/library';

interface UseLibraryResult {
  playlists: LibraryPlaylist[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useLibrary(host: string, token: string): UseLibraryResult {
  const fetchFn = useCallback(() => fetchLibrary(host, token), [host, token]);
  const { data, loading, error, refetch } = useRemoteResource<LibraryPlaylist>(fetchFn);
  return { playlists: data, loading, error, refetch };
}
