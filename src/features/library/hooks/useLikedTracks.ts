import { useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useStreamedUserQuery } from '@/hooks/useStreamedUserQuery';
import { api } from '@/lib/tauri';
import { LIKED_TRACKS_KEY } from '@/lib/query';
import type { TracksBatchEvent } from '@/bindings';

export function useLikedTracks(enabled: boolean) {
  const username = useAuthStore((s) => s.username);

  const getTracksFromEvent = useCallback((payload: unknown) => (payload as TracksBatchEvent).tracks, []);

  const query = useStreamedUserQuery({
    eventName: 'liked-tracks-batch',
    queryKey: [LIKED_TRACKS_KEY, username],
    queryFn: api.getLikedTracks,
    getItemsFromEvent: getTracksFromEvent,
    enabled,
  });

  return {
    tracks: query.data ?? [],
    isLoading: query.isLoading,
    isStreaming: query.isStreaming,
    error: query.error,
    refetch: query.refetch,
  };
}
