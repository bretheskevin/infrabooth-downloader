import { invoke } from '@tauri-apps/api/core';

/**
 * Request payload for downloading a track with metadata.
 */
export interface DownloadRequest {
  /** The SoundCloud track URL to download */
  trackUrl: string;
  /** Unique identifier for the track (used in progress events) */
  trackId: string;
  /** Track title (used for ID3 tag and filename) */
  title: string;
  /** Artist/creator name (used for ID3 tag and filename) */
  artist: string;
  /** Album name - typically playlist title if from playlist */
  album?: string;
  /** Track number in playlist (1-indexed) */
  trackNumber?: number;
  /** Total tracks in playlist */
  totalTracks?: number;
  /** URL to artwork image for embedding */
  artworkUrl?: string;
  /** Optional output directory (defaults to system Downloads folder) */
  outputDir?: string;
}

/**
 * Download a track and convert it to MP3 with metadata.
 *
 * This function orchestrates the full download pipeline:
 * 1. Downloads audio using yt-dlp with OAuth authentication
 * 2. Converts to high-quality MP3 using yt-dlp native conversion
 * 3. Embeds ID3 metadata (title, artist, album, track number, artwork)
 *
 * Progress events are emitted via the `download-progress` event channel:
 * - "downloading" - During download and conversion
 * - "complete" - When pipeline finishes successfully
 * - "failed" - If any step fails
 *
 * @param request - The download request containing track URL, metadata, and options
 * @returns The path to the downloaded MP3 file on success
 */
export async function downloadTrack(request: DownloadRequest): Promise<string> {
  return invoke<string>('download_track_full', { request });
}

/**
 * @deprecated Use downloadTrack instead. This function is kept for backwards compatibility.
 */
export async function downloadAndConvertTrack(
  trackUrl: string,
  trackId: string,
  filename: string,
  outputDir?: string
): Promise<string> {
  // Extract artist and title from filename (format: "Artist - Title")
  const parts = filename.split(' - ');
  const artist = parts[0] || 'Unknown Artist';
  const title = parts.slice(1).join(' - ') || filename;

  return downloadTrack({
    trackUrl,
    trackId,
    title,
    artist,
    outputDir,
  });
}
