import type { AppError } from './errors';

export interface FailedTrack {
  id: string;
  title: string;
  artist: string;
  error: AppError;
}

export type FailureReasonCategory =
  | 'geo_blocked'
  | 'unavailable'
  | 'network'
  | 'other';
