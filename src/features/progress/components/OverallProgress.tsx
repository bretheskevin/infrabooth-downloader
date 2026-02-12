import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cancelDownloadQueue } from '@/features/download/api/download';
import { cn } from '@/lib/utils';
import { useQueueStore } from '@/features/download/store';
import { useTranslation } from 'react-i18next';

interface OverallProgressProps {
  className?: string;
}

export function OverallProgress({ className }: OverallProgressProps) {
  const { t } = useTranslation();

  const tracks = useQueueStore((state) => state.tracks);
  const isCancelling = useQueueStore((state) => state.isCancelling);
  const setCancelling = useQueueStore((state) => state.setCancelling);
  const totalCount = tracks.length;
  const completedCount = tracks.filter((track) => track.status === 'complete').length;

  // Check if any track is currently being processed (downloading or converting)
  const hasActiveTrack = tracks.some(
    (track) => track.status === 'downloading' || track.status === 'converting'
  );
  // Check if there are still tracks waiting to be processed
  const hasPendingTrack = tracks.some((track) => track.status === 'pending');

  // Don't render if no tracks in queue
  if (totalCount === 0) {
    return null;
  }

  const percentage = Math.round((completedCount / totalCount) * 100);

  // Show preparing state when no track is actively downloading/converting but some are still pending
  const showPreparing = !hasActiveTrack && hasPendingTrack;

  // Use singular form for single track
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

  // Show cancel button when there's work in progress or pending
  const showCancelButton = hasActiveTrack || hasPendingTrack;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showPreparing && (
            <Spinner className="h-4 w-4 text-primary" />
          )}
          <span
            aria-live="polite"
            className="text-sm text-foreground"
          >
            {isCancelling
              ? t('download.cancelling')
              : showPreparing
                ? t('download.preparingTracks')
                : progressText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!showPreparing && !isCancelling && (
            <span className="text-sm text-muted-foreground">
              {percentage}%
            </span>
          )}
          {showCancelButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={isCancelling}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
        className={cn('h-2', showPreparing && 'animate-pulse')}
      />
    </div>
  );
}
