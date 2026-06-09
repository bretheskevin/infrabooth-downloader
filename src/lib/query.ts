import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/tauri';

export const DEFAULT_STALE_TIME = 5 * 60 * 1000;
export const DEFAULT_GC_TIME = 10 * 60 * 1000;
export const FOLLOWED_ARTISTS_KEY = ['followed-artists'] as const;
export const FOLLOWED_ARTISTS_AUTO_REFRESH_MS = 60 * 60 * 1000;
export const FOLLOW_STATUS_KEY = 'follow-status';
export const LIKED_TRACKS_KEY = 'liked-tracks';
export const LIBRARY_PLAYLISTS_KEY = 'library-playlists';

export async function refreshFollowedArtists(queryClient: QueryClient) {
  const result = await api.getFollowedArtists(true);
  queryClient.setQueryData([...FOLLOWED_ARTISTS_KEY], result);
}
