import { Progress } from '@/components/ui/progress';
import { useQueueStore } from '@/stores/queueStore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface OverallProgressProps {
  className?: string;
}

export function OverallProgress({ className }: OverallProgressProps) {
  const { t } = useTranslation();

  const tracks = useQueueStore((state) => state.tracks);
  const totalCount = tracks.length;
  const completedCount = tracks.filter((track) => track.status === 'complete').length;

  // Check if any track has started (downloading, converting, complete, or failed)
  const hasAnyTrackStarted = tracks.some(
    (track) => track.status !== 'pending'
  );

  // Don't render if no tracks in queue
  if (totalCount === 0) {
    return null;
  }

  const percentage = Math.round((completedCount / totalCount) * 100);

  // Show initializing state when no track has started yet
  const isInitializing = !hasAnyTrackStarted;

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
          {isInitializing && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span
            aria-live="polite"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            {isInitializing ? t('download.preparingTracks') : progressText}
          </span>
        </div>
        {!isInitializing && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
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
        className={cn('h-2', isInitializing && 'animate-pulse')}
      />
    </div>
  );
}
