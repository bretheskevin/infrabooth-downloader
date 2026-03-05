import type { AppError } from './errors';

export type TrackStatus =
  | 'pending'
  | 'downloading'
  | 'converting'
  | 'complete'
  | 'failed'
  | 'rate_limited';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  durationMs: number;
  status: TrackStatus;
  error?: AppError;
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
}

/** Context for playlist track numbering */
export interface PlaylistContext {
  /** 1-indexed position in playlist */
  trackPosition: number;
  /** Total number of tracks in playlist */
  totalTracks: number;
}
