import type { AppError } from './errors';

export type TrackStatus =
  | 'pending'
  | 'downloading'
  | 'converting'
  | 'complete'
  | 'failed'
  | 'rate_limited'
  | 'skipped';

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
  downloadUrl?: string | null;
  filePath?: string;
}
