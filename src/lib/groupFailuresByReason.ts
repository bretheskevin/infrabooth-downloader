import type { FailedTrack, FailureReasonCategory } from '@/types/download';

const categorizeError = (error: {
  code: string;
  message: string;
}): FailureReasonCategory => {
  if (error.code === 'GEO_BLOCKED') return 'geo_blocked';
  if (error.code === 'NETWORK_ERROR') return 'network';
  if (error.code === 'DOWNLOAD_FAILED') {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('unavailable') ||
      msg.includes('private') ||
      msg.includes('removed')
    ) {
      return 'unavailable';
    }
  }
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
