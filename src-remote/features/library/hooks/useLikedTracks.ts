import { useCallback } from 'react';
import { useRemoteResource } from '@remote/lib/useRemoteResource';
import type { RemoteTrack } from '@/lib/remote-protocol';
import { fetchLikedTracks } from '../api/likedTracks';

interface UseLikedTracksResult {
  tracks: RemoteTrack[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useLikedTracks(host: string, token: string): UseLikedTracksResult {
  const fetchFn = useCallback(() => fetchLikedTracks(host, token), [host, token]);
  const { data, loading, error, refetch } = useRemoteResource<RemoteTrack>(fetchFn);
  return { tracks: data, loading, error, refetch };
}
