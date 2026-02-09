import type { AppError } from './errors';

/**
 * Download progress event payload received from the Rust backend.
 *
 * Emitted via the `download-progress` event channel during track downloads.
 */
export interface DownloadProgressEvent {
  trackId: string;
  status: 'pending' | 'downloading' | 'converting' | 'complete' | 'failed' | 'rate_limited';
  percent?: number;
  error?: AppError;
}

/**
 * Queue progress event payload received from the Rust backend.
 *
 * Emitted via the `queue-progress` event channel after each track starts.
 */
export interface QueueProgressEvent {
  /** Current track index (1-indexed) */
  current: number;
  /** Total number of tracks in queue */
  total: number;
  /** ID of the track being processed */
  trackId: string;
}

/**
 * Queue completion event payload received from the Rust backend.
 *
 * Emitted via the `queue-complete` event channel when all tracks are processed.
 */
export interface QueueCompleteEvent {
  /** Number of successfully downloaded tracks */
  completed: number;
  /** Number of failed tracks */
  failed: number;
  /** Total number of tracks that were queued */
  total: number;
  /** Array of [trackId, errorMessage] tuples for failed tracks */
  failedTracks: Array<[string, string]>;
}
