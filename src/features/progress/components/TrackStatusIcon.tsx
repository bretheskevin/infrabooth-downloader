import { Clock, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getErrorSeverity, isUnavailableError } from '@/lib/errorMessages';
import type { TrackStatus } from '@/features/queue/types/track';
import type { ErrorCode, AppError } from '@/features/queue/types/errors';

export interface TrackStatusIconProps {
  status: TrackStatus;
  errorCode?: ErrorCode;
  error?: AppError;
  className?: string;
}

const ariaLabelKeys: Record<TrackStatus, string> = {
  pending: 'accessibility.statusPending',
  downloading: 'accessibility.statusDownloading',
  converting: 'accessibility.statusConverting',
  complete: 'accessibility.statusComplete',
  failed: 'accessibility.statusFailed',
  rate_limited: 'accessibility.statusRateLimited',
};

export function TrackStatusIcon({ status, errorCode, error, className }: TrackStatusIconProps) {
  const { t } = useTranslation();
  const baseClasses = 'h-4 w-4 flex-shrink-0';
  const ariaLabel = t(ariaLabelKeys[status]);

  switch (status) {
    case 'pending':
      return (
        <Clock
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-muted-foreground', className)}
        />
      );

    case 'downloading':
    case 'converting':
      return (
        <Loader2
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-primary animate-spin', className)}
        />
      );

    case 'complete':
      return (
        <CheckCircle2
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-success', className)}
        />
      );

    case 'rate_limited':
      return (
        <Clock
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-warning', className)}
        />
      );

    case 'failed': {
      // Check for unavailable error (uses warning icon/color)
      if (isUnavailableError(error)) {
        return (
          <AlertTriangle
            role="img"
            aria-label={t('accessibility.trackUnavailableRestriction')}
            className={cn(baseClasses, 'text-warning', className)}
          />
        );
      }

      const severity = getErrorSeverity(errorCode);
      if (severity === 'warning') {
        // Use specific aria-label for geo-blocked
        const warningLabel =
          errorCode === 'GEO_BLOCKED'
            ? t('accessibility.geoRestrictionWarning')
            : ariaLabel;
        return (
          <AlertTriangle
            role="img"
            aria-label={warningLabel}
            className={cn(baseClasses, 'text-warning', className)}
          />
        );
      }
      return (
        <XCircle
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-destructive', className)}
        />
      );
    }

    default:
      return null;
  }
}
