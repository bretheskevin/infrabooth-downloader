import { invoke } from '@tauri-apps/api/core';

/**
 * Download a track and convert it to MP3.
 *
 * This function uses yt-dlp's built-in MP3 conversion with 320kbps bitrate.
 * Progress events are emitted via the `download-progress` event channel:
 * - "downloading" - During download and conversion
 * - "complete" - When pipeline finishes successfully
 * - "failed" - If any step fails
 *
 * @param trackUrl - The SoundCloud track URL to download
 * @param trackId - Unique identifier for the track (used in progress events)
 * @param filename - Desired filename without extension (e.g., "Artist - Title")
 * @param outputDir - Optional output directory (defaults to system Downloads folder)
 * @returns The path to the downloaded MP3 file on success
 */
export async function downloadAndConvertTrack(
  trackUrl: string,
  trackId: string,
  filename: string,
  outputDir?: string
): Promise<string> {
  return invoke<string>('download_track_full', {
    trackUrl,
    trackId,
    filename,
    outputDir,
  });
}
