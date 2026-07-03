import { useState, useEffect, useRef, useCallback } from 'react';
import type { LibraryPlaylist } from '../utils/filterPlaylists';
import { fetchLibrary } from '../api/library';

interface UseLibraryResult {
  playlists: LibraryPlaylist[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useLibrary(host: string, token: string): UseLibraryResult {
  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetched = useRef(false);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setPlaylists(await fetchLibrary(host, token));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [host, token]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void doFetch();
  }, [doFetch]);

  const refetch = useCallback(() => {
    void doFetch();
  }, [doFetch]);

  return { playlists, loading, error, refetch };
}
