import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import type { UrlType } from '@/features/url-input/types/url';

export type { PlaylistInfo, TrackInfo, UserInfo } from '@/bindings';

export async function fetchPlaylistInfo(url: string) {
  logger.info(`[playlist.ts] Invoking get_playlist_info with url: ${url}`);
  return api.getPlaylistInfo(url);
}

export async function fetchTrackInfo(url: string) {
  logger.info(`[playlist.ts] Invoking get_track_info with url: ${url}`);
  return api.getTrackInfo(url);
}

/**
 * Fetches media info based on the known URL type.
 * For short links (on.soundcloud.com) where the type is unknown,
 * tries track first and falls back to playlist.
 */
export async function fetchMediaInfo(url: string, urlType: UrlType | null) {
  const normalized = `https://${url.replace(/^https?:\/\//, '')}`;
  if (urlType === 'playlist') return fetchPlaylistInfo(normalized);
  if (urlType === 'track') return fetchTrackInfo(normalized);

  // Short links — type unknown until resolved
  try {
    return await fetchTrackInfo(normalized);
  } catch {
    return fetchPlaylistInfo(normalized);
  }
}
