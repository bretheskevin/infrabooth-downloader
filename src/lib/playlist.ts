import { invoke } from '@tauri-apps/api/core';
import type { PlaylistInfo } from '@/types/playlist';

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
