import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { OpenFolderButton } from '@/components/OpenFolderButton';
import { cancelDownloadQueue } from '@/features/queue/api/download';
import { cn } from '@/lib/utils';
import { useQueueStore } from '@/features/queue/store';
import { useTranslation } from 'react-i18next';
import { useOverallProgressStats } from '../hooks/useOverallProgressStats';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';

interface OverallProgressProps {
  className?: string;
}

const queueActions = () => useQueueStore.getState();

export function OverallProgress({ className }: OverallProgressProps) {
  const { t } = useTranslation();

  const { isCancelling, outputDir } = useQueueStore(
    useShallow((state) => ({
      isCancelling: state.isCancelling,
      outputDir: state.outputDir,
    })),
  );
  const handleOpenFolder = useOpenDownloadFolder(outputDir);

  const { totalCount, completedCount, skippedCount, percentage, showPreparing, showCancelButton } = useOverallProgressStats();

  if (totalCount === 0) {
    return null;
  }

  const translationKey = totalCount === 1 ? 'download.progressSingle' : 'download.progress';

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
    queueActions().setCancelling(true);
    try {
      await cancelDownloadQueue();
    } catch {
      queueActions().setCancelling(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showPreparing && <Spinner className="h-4 w-4 text-primary" />}
          <span aria-live="polite" className="text-sm font-medium text-foreground">
            {isCancelling ? t('download.cancelling') : showPreparing ? t('download.preparingTracks') : progressText}
            {skippedCount > 0 && !isCancelling && !showPreparing && (
              <span className="text-xs text-success ml-1">{t('download.skippedCount', { count: skippedCount })}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isCancelling && <span className="text-sm font-semibold tabular-nums text-primary">{percentage}%</span>}
          <OpenFolderButton onClick={handleOpenFolder} />
          {showCancelButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={t('download.cancel')}
                >
                  {isCancelling ? <Spinner className="h-4 w-4" /> : <X className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('download.cancel')}</TooltipContent>
            </Tooltip>
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
