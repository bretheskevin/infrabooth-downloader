import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';

export type {
  DownloadRequest,
  StartQueueRequest,
  QueueItemRequest,
  ErrorResponse,
} from '@/bindings';

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
export async function downloadTrack(request: Parameters<typeof api.downloadTrackFull>[0]): Promise<string> {
  logger.info(`[download] Starting track download: ${request.title} by ${request.artist}`);
  logger.debug(`[download] Track URL: ${request.trackUrl}`);

  const result = await api.downloadTrackFull(request);

  logger.info(`[download] Track download complete: ${result}`);
  return result;
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
  request: Parameters<typeof api.startDownloadQueue>[0]
): Promise<void> {
  logger.info(`[download] Starting download queue with ${request.tracks.length} tracks`);
  if (request.albumName) {
    logger.debug(`[download] Album name: ${request.albumName}`);
  }

  await api.startDownloadQueue(request);

  logger.info(`[download] Queue started successfully`);
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

  await api.cancelDownloadQueue();

  logger.info('[download] Queue cancellation requested');
}
