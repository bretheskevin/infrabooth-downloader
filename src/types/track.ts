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
