import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/lib/logger';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

/**
 * Fetches playlist information from SoundCloud.
 *
 * @param url - The SoundCloud playlist URL
 * @returns The playlist metadata and tracks
 * @throws Error if the fetch fails
 */
export async function fetchPlaylistInfo(url: string): Promise<PlaylistInfo> {
  logger.info(`[playlist.ts] Invoking get_playlist_info with url: ${url}`);
  return invoke<PlaylistInfo>('get_playlist_info', { url });
}

/**
 * Fetches track information from SoundCloud.
 *
 * @param url - The SoundCloud track URL
 * @returns The track metadata
 * @throws Error if the fetch fails (track not found, geo-blocked, etc.)
 */
export async function fetchTrackInfo(url: string): Promise<TrackInfo> {
  logger.info(`[playlist.ts] Invoking get_track_info with url: ${url}`);
  return invoke<TrackInfo>('get_track_info', { url });
}
