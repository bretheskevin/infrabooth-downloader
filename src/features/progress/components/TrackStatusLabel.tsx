import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ERROR_CODE_TO_I18N_KEY, getErrorSeverity, isUnavailableError } from '@/lib/errorMessages';
import type { TrackStatus } from '@/features/queue/types/track';
import type { AppError } from '@/features/queue/types/errors';

export interface TrackStatusLabelProps {
  status: TrackStatus;
  error?: AppError;
  className?: string;
}

const statusColorClasses: Record<TrackStatus, string> = {
  pending: 'text-muted-foreground',
  downloading: 'text-primary',
  converting: 'text-primary',
  complete: 'text-success',
  failed: 'text-destructive',
  rate_limited: 'text-warning',
};

export function TrackStatusLabel({ status, error, className }: TrackStatusLabelProps) {
  const { t } = useTranslation();

  const getStatusText = (): string => {
    if (status === 'failed' && error) {
      // Check for unavailable error first (DOWNLOAD_FAILED with unavailability patterns)
      if (isUnavailableError(error)) {
        return t('errors.trackUnavailable');
      }
      return t(ERROR_CODE_TO_I18N_KEY[error.code] || 'download.status.failed');
    }

    const statusKeys: Record<TrackStatus, string> = {
      pending: 'download.status.pending',
      downloading: 'download.status.downloading',
      converting: 'download.status.converting',
      complete: 'download.status.complete',
      failed: 'download.status.failed',
      rate_limited: 'download.rateLimitStatus',
    };

    return t(statusKeys[status]);
  };

  // Use warning color for warning-severity errors (geo-blocked, unavailable, rate-limited)
  const getColorClass = (): string => {
    if (status === 'failed' && error) {
      // Unavailable tracks use warning color - external failure, not app error
      if (isUnavailableError(error)) {
        return 'text-warning';
      }
      // Other warning-severity errors (geo-blocked)
      if (getErrorSeverity(error.code) === 'warning') {
        return 'text-warning';
      }
    }
    return statusColorClasses[status];
  };

  return (
    <span
      className={cn(
        'text-xs font-medium',
        getColorClass(),
        className
      )}
    >
      {getStatusText()}
    </span>
  );
}
