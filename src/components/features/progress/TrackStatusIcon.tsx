import { Clock, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorSeverity, isUnavailableError } from '@/lib/errorMessages';
import type { TrackStatus } from '@/types/track';
import type { ErrorCode, AppError } from '@/types/errors';

export interface TrackStatusIconProps {
  status: TrackStatus;
  errorCode?: ErrorCode;
  error?: AppError;
  className?: string;
}

const ariaLabels: Record<TrackStatus, string> = {
  pending: 'Pending',
  downloading: 'Downloading',
  converting: 'Converting',
  complete: 'Complete',
  failed: 'Failed',
  rate_limited: 'Rate limited',
};

export function TrackStatusIcon({ status, errorCode, error, className }: TrackStatusIconProps) {
  const baseClasses = 'h-4 w-4 flex-shrink-0';
  const ariaLabel = ariaLabels[status];

  switch (status) {
    case 'pending':
      return (
        <Clock
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-gray-400', className)}
        />
      );

    case 'downloading':
    case 'converting':
      return (
        <Loader2
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-indigo-500 animate-spin', className)}
        />
      );

    case 'complete':
      return (
        <CheckCircle2
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-emerald-500', className)}
        />
      );

    case 'rate_limited':
      return (
        <Clock
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-amber-500', className)}
        />
      );

    case 'failed': {
      // Check for unavailable error (uses warning icon/color)
      if (isUnavailableError(error)) {
        return (
          <AlertTriangle
            role="img"
            aria-label="Track unavailable - external restriction"
            className={cn(baseClasses, 'text-amber-500', className)}
          />
        );
      }

      const severity = getErrorSeverity(errorCode);
      if (severity === 'warning') {
        // Use specific aria-label for geo-blocked
        const warningLabel =
          errorCode === 'GEO_BLOCKED'
            ? 'Geographic restriction warning'
            : ariaLabel;
        return (
          <AlertTriangle
            role="img"
            aria-label={warningLabel}
            className={cn(baseClasses, 'text-amber-500', className)}
          />
        );
      }
      return (
        <XCircle
          role="img"
          aria-label={ariaLabel}
          className={cn(baseClasses, 'text-rose-500', className)}
        />
      );
    }

    default:
      return null;
  }
}
