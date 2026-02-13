import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/lib/logger';

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
  logger.info(`[download] Starting track download: ${request.title} by ${request.artist}`);
  logger.debug(`[download] Track URL: ${request.trackUrl}`);
  try {
    const result = await invoke<string>('download_track_full', { request });
    logger.info(`[download] Track download complete: ${result}`);
    return result;
  } catch (error) {
    logger.error(`[download] Track download failed: ${error}`);
    throw error;
  }
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

/**
 * An item in the download queue.
 */
export interface QueueItem {
  /** The SoundCloud track URL to download */
  trackUrl: string;
  /** Unique identifier for the track (used in progress events) */
  trackId: string;
  /** Track title */
  title: string;
  /** Artist/creator name */
  artist: string;
  /** URL to artwork image for embedding */
  artworkUrl?: string;
}

/**
 * Request payload for starting a download queue.
 */
export interface StartQueueRequest {
  /** Array of tracks to download */
  tracks: QueueItem[];
  /** Album name - typically playlist title */
  albumName?: string;
  /** Optional output directory (defaults to system Downloads folder) */
  outputDir?: string;
}

/**
 * Start processing a download queue.
 *
 * This function adds all tracks to the queue and starts processing them sequentially.
 * Progress events are emitted via event channels:
 * - `queue-progress`: Overall queue progress (X of Y)
 * - `download-progress`: Per-track status
 * - `queue-complete`: Final results when queue finishes
 *
 * @param request - Queue request containing tracks and optional album name
 */
export async function startDownloadQueue(
  request: StartQueueRequest
): Promise<void> {
  logger.info(`[download] Starting download queue with ${request.tracks.length} tracks`);
  if (request.albumName) {
    logger.debug(`[download] Album name: ${request.albumName}`);
  }
  try {
    await invoke('start_download_queue', { request });
    logger.info(`[download] Queue started successfully`);
  } catch (error) {
    logger.error(`[download] Failed to start queue: ${error}`);
    throw error;
  }
}

/**
 * Cancel the current download queue.
 *
 * This function cancels the currently running download queue.
 * It will stop the queue after the current track finishes or immediately
 * if a track is actively downloading.
 */
export async function cancelDownloadQueue(): Promise<void> {
  logger.info('[download] Cancelling download queue');
  try {
    await invoke('cancel_download_queue');
    logger.info('[download] Queue cancellation requested');
  } catch (error) {
    logger.error(`[download] Failed to cancel queue: ${error}`);
    throw error;
  }
}
