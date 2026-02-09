import { invoke } from '@tauri-apps/api/core';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

/**
 * Fetches playlist information from SoundCloud.
 *
 * @param url - The SoundCloud playlist URL
 * @returns The playlist metadata and tracks
 * @throws Error if the fetch fails
 */
export async function fetchPlaylistInfo(url: string): Promise<PlaylistInfo> {
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
  return invoke<TrackInfo>('get_track_info', { url });
}
