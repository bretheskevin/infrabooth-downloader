import type { AppError } from '@/features/download/types/errors';
import type { TrackStatus } from '@/features/download/types/track';

/**
 * Download progress event payload received from the Rust backend.
 *
 * Emitted via the `download-progress` event channel during track downloads.
 */
export interface DownloadProgressEvent {
  trackId: string;
  status: TrackStatus;
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

/**
 * Queue cancelled event payload received from the Rust backend.
 *
 * Emitted via the `queue-cancelled` event channel when the queue is cancelled by user.
 */
export interface QueueCancelledEvent {
  /** Number of successfully downloaded tracks before cancellation */
  completed: number;
  /** Number of tracks that were cancelled */
  cancelled: number;
  /** Total number of tracks that were queued */
  total: number;
}
