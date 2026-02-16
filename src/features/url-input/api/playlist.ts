import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';

export type { PlaylistInfo, TrackInfo, UserInfo } from '@/bindings';

/**
 * Fetches playlist information from SoundCloud.
 *
 * @param url - The SoundCloud playlist URL
 * @returns The playlist metadata and tracks
 * @throws Error if the fetch fails
 */
export async function fetchPlaylistInfo(url: string) {
  logger.info(`[playlist.ts] Invoking get_playlist_info with url: ${url}`);
  return api.getPlaylistInfo(url);
}

/**
 * Fetches track information from SoundCloud.
 *
 * @param url - The SoundCloud track URL
 * @returns The track metadata
 * @throws Error if the fetch fails (track not found, geo-blocked, etc.)
 */
export async function fetchTrackInfo(url: string) {
  logger.info(`[playlist.ts] Invoking get_track_info with url: ${url}`);
  return api.getTrackInfo(url);
}
