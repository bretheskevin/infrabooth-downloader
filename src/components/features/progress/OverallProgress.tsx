import { Progress } from '@/components/ui/progress';
import { useQueueStore } from '@/stores/queueStore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface OverallProgressProps {
  className?: string;
}

export function OverallProgress({ className }: OverallProgressProps) {
  const { t } = useTranslation();

  const completedCount = useQueueStore(
    (state) => state.tracks.filter((track) => track.status === 'complete').length
  );
  const totalCount = useQueueStore((state) => state.tracks.length);

  // Don't render if no tracks in queue
  if (totalCount === 0) {
    return null;
  }

  const percentage = Math.round((completedCount / totalCount) * 100);

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
        <span
          aria-live="polite"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          {progressText}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {percentage}%
        </span>
      </div>
      <Progress
        value={percentage}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2"
      />
    </div>
  );
}
