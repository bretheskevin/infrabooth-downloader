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
  status: TrackStatus;
  error?: AppError;
}

/** Context for playlist track numbering (used by yt-dlp) */
export interface PlaylistContext {
  /** 1-indexed position in playlist */
  trackPosition: number;
  /** Total number of tracks in playlist */
  totalTracks: number;
}
