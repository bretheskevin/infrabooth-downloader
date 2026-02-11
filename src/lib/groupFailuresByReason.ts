import type { FailedTrack, FailureReasonCategory } from '@/types/download';
import type { AppError } from '@/types/errors';
import { isGeoBlockedError, isUnavailableError } from '@/lib/errorMessages';

const categorizeError = (error: AppError): FailureReasonCategory => {
  if (isGeoBlockedError(error)) return 'geo_blocked';
  if (error.code === 'NETWORK_ERROR') return 'network';
  if (isUnavailableError(error)) return 'unavailable';
  return 'other';
};

export function groupFailuresByReason(
  tracks: FailedTrack[]
): Map<FailureReasonCategory, FailedTrack[]> {
  const groups = new Map<FailureReasonCategory, FailedTrack[]>();

  for (const track of tracks) {
    const category = categorizeError(track.error);
    const existing = groups.get(category) || [];
    groups.set(category, [...existing, track]);
  }

  return groups;
}
