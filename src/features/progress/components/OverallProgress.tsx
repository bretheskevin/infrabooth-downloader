import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cancelDownloadQueue } from '@/features/queue/api/download';
import { cn } from '@/lib/utils';
import { useQueueStore } from '@/features/queue/store';
import { useTranslation } from 'react-i18next';
import { useOverallProgressStats } from '../hooks/useOverallProgressStats';

interface OverallProgressProps {
  className?: string;
}

export function OverallProgress({ className }: OverallProgressProps) {
  const { t } = useTranslation();

  const isCancelling = useQueueStore((state) => state.isCancelling);
  const setCancelling = useQueueStore((state) => state.setCancelling);

  const {
    totalCount,
    completedCount,
    percentage,
    showPreparing,
    showCancelButton,
  } = useOverallProgressStats();

  if (totalCount === 0) {
    return null;
  }

  const translationKey =
    totalCount === 1 ? 'download.progressSingle' : 'download.progress';

  const progressText = t(translationKey, {
    current: completedCount,
    total: totalCount,
  });

  const ariaLabel = t('download.progressAriaLabel', {
    current: completedCount,
    total: totalCount,
    percentage,
  });

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelDownloadQueue();
    } catch {
      setCancelling(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showPreparing && (
            <Spinner className="h-4 w-4 text-primary" />
          )}
          <span
            aria-live="polite"
            className="text-sm font-medium text-foreground"
          >
            {isCancelling
              ? t('download.cancelling')
              : showPreparing
                ? t('download.preparingTracks')
                : progressText}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isCancelling && (
            <span className="text-sm font-semibold tabular-nums text-primary">
              {percentage}%
            </span>
          )}
          {showCancelButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={isCancelling}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              aria-label={t('download.cancel')}
            >
              {isCancelling ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
      </div>
      <Progress
        value={percentage}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className={cn('h-2.5 rounded-full', showPreparing && 'animate-pulse')}
      />
    </div>
  );
}
