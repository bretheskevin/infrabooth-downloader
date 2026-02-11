import { Progress } from '@/components/ui/progress';
import { useQueueStore } from '@/stores/queueStore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface OverallProgressProps {
  className?: string;
}

export function OverallProgress({ className }: OverallProgressProps) {
  const { t } = useTranslation();

  const tracks = useQueueStore((state) => state.tracks);
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
            {showPreparing ? t('download.preparingTracks') : progressText}
          </span>
        </div>
        {!showPreparing && (
          <span className="text-sm text-muted-foreground">
            {percentage}%
          </span>
        )}
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
