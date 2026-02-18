import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { FailedTrack } from '@/features/queue/types/download';
import { cn } from '@/lib/utils';
import { getErrorDisplayMessage, getErrorDetailMessage } from '@/lib/errorMessages';

interface FailedTrackItemProps {
  track: FailedTrack;
  onRetry?: (trackId: string) => void;
  isRetrying?: boolean;
}

export function FailedTrackItem({
  track,
  onRetry,
  isRetrying = false,
}: FailedTrackItemProps) {
  const { t } = useTranslation();

  return (
    <div
      role="listitem"
      className={cn(
        'group flex items-start gap-3 rounded-lg px-3 py-2.5',
        'border-l-2 border-warning/50',
        'transition-colors hover:bg-muted/50'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {track.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
        {track.error && (
          <div className="mt-1.5 flex items-start gap-1.5">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-destructive/70" aria-hidden="true" />
            <div className="text-xs text-destructive/80">
              <p className="line-clamp-1">{getErrorDisplayMessage(track.error, t)}</p>
              {getErrorDetailMessage(track.error, t) && (
                <p className="text-muted-foreground/70 line-clamp-1">
                  {getErrorDetailMessage(track.error, t)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRetry(track.id)}
          disabled={isRetrying}
          aria-label={t('errors.retryTrack')}
          className={cn(
            'h-7 w-7 p-0 opacity-0 transition-opacity flex-shrink-0 mt-0.5',
            'group-hover:opacity-100 focus-visible:opacity-100',
            isRetrying && 'opacity-100'
          )}
        >
          <RefreshCw
            className={cn('h-4 w-4', isRetrying && 'animate-spin')}
            aria-hidden="true"
          />
        </Button>
      )}
    </div>
  );
}
