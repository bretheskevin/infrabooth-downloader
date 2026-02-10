import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ERROR_CODE_TO_I18N_KEY } from '@/lib/errorMessages';
import type { TrackStatus } from '@/types/track';
import type { AppError } from '@/types/errors';

export interface TrackStatusLabelProps {
  status: TrackStatus;
  error?: AppError;
  className?: string;
}

const statusColorClasses: Record<TrackStatus, string> = {
  pending: 'text-muted-foreground',
  downloading: 'text-indigo-600',
  converting: 'text-indigo-600',
  complete: 'text-emerald-600',
  failed: 'text-rose-600',
  rate_limited: 'text-amber-600',
};

export function TrackStatusLabel({ status, error, className }: TrackStatusLabelProps) {
  const { t } = useTranslation();

  const getStatusText = (): string => {
    if (status === 'failed' && error) {
      return t(ERROR_CODE_TO_I18N_KEY[error.code] || 'download.status.failed');
    }

    const statusKeys: Record<TrackStatus, string> = {
      pending: 'download.status.pending',
      downloading: 'download.status.downloading',
      converting: 'download.status.converting',
      complete: 'download.status.complete',
      failed: 'download.status.failed',
      rate_limited: 'download.status.rateLimited',
    };

    return t(statusKeys[status]);
  };

  return (
    <span
      className={cn(
        'text-xs font-medium',
        statusColorClasses[status],
        className
      )}
    >
      {getStatusText()}
    </span>
  );
}
