import { useState, useEffect, useCallback } from 'react';
import type { RemoteTrack } from '@/lib/remote-protocol';
import { fetchPlaylistTracks } from '@remote/features/library/api/library';

interface UsePlaylistTracksResult {
  tracks: RemoteTrack[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function usePlaylistTracks(host: string, token: string, playlistId: number, secretToken: string | null): UsePlaylistTracksResult {
  const [tracks, setTracks] = useState<RemoteTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    setTracks([]);
    try {
      setTracks(await fetchPlaylistTracks(host, token, playlistId, secretToken));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [host, token, playlistId, secretToken]);

  useEffect(() => {
    void doFetch();
  }, [doFetch]);

  const refetch = useCallback(() => {
    void doFetch();
  }, [doFetch]);

  return { tracks, loading, error, refetch };
}
