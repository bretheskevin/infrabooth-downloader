import { invoke } from '@tauri-apps/api/core';

/**
 * Start downloading a track using yt-dlp with OAuth authentication.
 *
 * Downloads audio at the highest quality available based on user's subscription.
 * Progress events are emitted via the `download-progress` event channel.
 *
 * @param trackUrl - The SoundCloud track URL to download
 * @param trackId - Unique identifier for the track (used in progress events)
 * @returns The path to the downloaded file on success
 */
export async function downloadTrack(
  trackUrl: string,
  trackId: string
): Promise<string> {
  return invoke<string>('start_track_download', {
    trackUrl,
    trackId,
  });
}
