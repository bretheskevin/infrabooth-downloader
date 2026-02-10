import { cn } from '@/lib/utils';
import { TrackStatusIcon } from './TrackStatusIcon';
import { TrackStatusLabel } from './TrackStatusLabel';
import type { TrackStatus } from '@/types/track';
import type { AppError } from '@/types/errors';

export interface TrackStatusBadgeProps {
  status: TrackStatus;
  error?: AppError;
  className?: string;
}

export function TrackStatusBadge({ status, error, className }: TrackStatusBadgeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-1.5', className)}
    >
      <TrackStatusIcon status={status} errorCode={error?.code} />
      <TrackStatusLabel status={status} error={error} />
    </div>
  );
}
