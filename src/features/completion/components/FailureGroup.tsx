import { useTranslation } from 'react-i18next';
import type { FailedTrack, FailureReasonCategory } from '@/features/queue/types/download';
import { FailedTrackItem } from './FailedTrackItem';

interface FailureGroupProps {
  category: FailureReasonCategory;
  tracks: FailedTrack[];
}

const CATEGORY_LABEL_KEYS: Record<FailureReasonCategory, string> = {
  geo_blocked: 'errors.groupGeoBlocked',
  unavailable: 'errors.groupUnavailable',
  network: 'errors.groupNetwork',
  other: 'errors.groupOther',
};

export function FailureGroup({ category, tracks }: FailureGroupProps) {
  const { t } = useTranslation();

  if (tracks.length === 0) return null;

  const labelKey = CATEGORY_LABEL_KEYS[category];

  return (
    <div className="mb-3 last:mb-0" role="group">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t(labelKey)} ({tracks.length})
      </h4>
      <div className="space-y-0.5">
        {tracks.map((track) => (
          <FailedTrackItem key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
}
