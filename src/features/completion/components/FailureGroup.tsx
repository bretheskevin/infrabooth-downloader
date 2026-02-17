import { useTranslation } from 'react-i18next';
import type {
  FailedTrack,
  FailureReasonCategory,
} from '@/features/queue/types/download';
import { FailedTrackItem } from './FailedTrackItem';

interface FailureGroupProps {
  category: FailureReasonCategory;
  tracks: FailedTrack[];
  onRetryTrack?: (trackId: string) => void;
  isRetrying?: boolean;
}

const CATEGORY_LABEL_KEYS: Record<FailureReasonCategory, string> = {
  geo_blocked: 'errors.groupGeoBlocked',
  unavailable: 'errors.groupUnavailable',
  network: 'errors.groupNetwork',
  other: 'errors.groupOther',
};

const RETRYABLE_CATEGORIES: FailureReasonCategory[] = ['network', 'other'];

export function FailureGroup({
  category,
  tracks,
  onRetryTrack,
  isRetrying = false,
}: FailureGroupProps) {
  const { t } = useTranslation();

  if (tracks.length === 0) return null;

  const labelKey = CATEGORY_LABEL_KEYS[category];
  const canRetry = RETRYABLE_CATEGORIES.includes(category);

  return (
    <div className="mb-3 last:mb-0" role="group">
      <h4 className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t(labelKey)} ({tracks.length})
      </h4>
      <div className="space-y-0.5">
        {tracks.map((track) => (
          <FailedTrackItem
            key={track.id}
            track={track}
            onRetry={canRetry ? onRetryTrack : undefined}
            isRetrying={isRetrying}
          />
        ))}
      </div>
    </div>
  );
}
