import { useCallback } from 'react';
import { api } from '@/lib/tauri';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '@/lib/query';
import { useStreamedUserQuery } from '@/hooks/useStreamedUserQuery';
import type { ArtistProfile, ArtistProfilesBatchEvent } from '@/bindings';

const FOLLOW_CONFIG = {
  followers: { eventName: 'artist-followers-batch', queryKey: 'artist-followers', apiFn: api.getArtistFollowers },
  followings: { eventName: 'artist-followings-batch', queryKey: 'artist-followings', apiFn: api.getArtistFollowings },
} as const;

export function useArtistFollowList(type: 'followers' | 'followings', artistId: number | null) {
  const { eventName, queryKey, apiFn } = FOLLOW_CONFIG[type];

  const getItemsFromEvent = useCallback(
    (payload: unknown) => {
      const event = payload as ArtistProfilesBatchEvent;
      return event.entityId === artistId ? event.profiles : [];
    },
    [artistId],
  );

  return useStreamedUserQuery<ArtistProfile>({
    eventName,
    queryKey: [queryKey, artistId],
    queryFn: () => apiFn(artistId!),
    getItemsFromEvent,
    enabled: artistId !== null,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
