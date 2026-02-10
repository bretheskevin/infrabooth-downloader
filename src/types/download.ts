export interface FailedTrack {
  id: string;
  title: string;
  artist: string;
  error: {
    code: string;
    message: string;
  };
}

export type FailureReasonCategory =
  | 'geo_blocked'
  | 'unavailable'
  | 'network'
  | 'other';
