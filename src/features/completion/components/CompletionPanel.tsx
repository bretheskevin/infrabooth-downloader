import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FolderOpen, RefreshCw, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueueStore } from '@/features/queue/store';
import { openDownloadFolder } from '@/lib/shellCommands';
import { getDefaultDownloadPath } from '@/features/settings/api/settings';
import { logger } from '@/lib/logger';
import { SuccessMessage } from './SuccessMessage';
import { ErrorPanelTrigger } from './ErrorPanelTrigger';
import { ErrorPanel } from './ErrorPanel';
import { AnimatedCheckmark } from './AnimatedCheckmark';
import { useFailedTracks } from '@/features/queue/hooks/useFailedTracks';
import { useRetryTracks } from '@/features/queue/hooks/useRetryTracks';
import { cn } from '@/lib/utils';

interface CompletionPanelProps {
  completedCount: number;
  totalCount: number;
  failedCount: number;
  cancelledCount: number;
  isCancelled: boolean;
  onDownloadAnother: () => void;
}

export function CompletionPanel({
  completedCount,
  totalCount,
  failedCount,
  cancelledCount,
  isCancelled,
  onDownloadAnother,
}: CompletionPanelProps) {
  const { t } = useTranslation();
  const outputDir = useQueueStore((state) => state.outputDir);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isErrorPanelOpen, setIsErrorPanelOpen] = useState(false);
  const failedTracks = useFailedTracks();
  const { retryAllFailed, retrySingleTrack, isRetrying, canRetry } =
    useRetryTracks();

  const isFullSuccess = failedCount === 0 && !isCancelled;

  const handleOpenFolder = async () => {
    logger.info('[CompletionPanel] Open folder clicked');
    logger.debug(
      `[CompletionPanel] Output dir from queue store: "${outputDir}"`
    );

    let pathToOpen = outputDir;

    if (!pathToOpen) {
      logger.debug(
        '[CompletionPanel] No output dir in queue store, fetching default'
      );
      try {
        pathToOpen = await getDefaultDownloadPath();
        logger.debug(`[CompletionPanel] Got default path: "${pathToOpen}"`);
      } catch (error) {
        logger.error(`[CompletionPanel] Failed to get default path: ${error}`);
        return;
      }
    }

    if (pathToOpen) {
      try {
        await openDownloadFolder(pathToOpen);
      } catch (error) {
        logger.error(`[CompletionPanel] Failed to open folder: ${error}`);
      }
    } else {
      logger.warn('[CompletionPanel] No path available to open');
    }
  };

  const handleToggleErrorPanel = () => {
    setIsErrorPanelOpen((prev) => !prev);
  };

  const handleRetryAll = async () => {
    setIsErrorPanelOpen(false);
    await retryAllFailed();
  };

  const handleRetrySingle = async (trackId: string) => {
    await retrySingleTrack(trackId);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      panelRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card
      ref={panelRef}
      tabIndex={-1}
      className="animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none"
      role="status"
      aria-live="polite"
      aria-label={t('completion.tracksDownloaded', {
        completed: completedCount,
        total: totalCount,
      })}
    >
      <CardContent className="pt-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex items-center justify-center rounded-full',
              isCancelled ? 'bg-muted p-3' : 'bg-success/10'
            )}
          >
            {isCancelled ? (
              <XCircle
                className="h-8 w-8 text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <AnimatedCheckmark size={48} />
            )}
          </div>

          <SuccessMessage
            completedCount={completedCount}
            totalCount={totalCount}
            cancelledCount={cancelledCount}
            isFullSuccess={isFullSuccess}
            isCancelled={isCancelled}
          />

          {failedCount > 0 && (
            <div className="w-full">
              <ErrorPanelTrigger
                failedCount={failedCount}
                onClick={handleToggleErrorPanel}
                onRetryAll={canRetry ? handleRetryAll : undefined}
                isExpanded={isErrorPanelOpen}
                isRetrying={isRetrying}
              />
              <ErrorPanel
                failedTracks={failedTracks}
                isOpen={isErrorPanelOpen}
                onOpenChange={setIsErrorPanelOpen}
                onRetryTrack={handleRetrySingle}
                isRetrying={isRetrying}
              />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-center gap-3 pb-6">
        <Button
          variant="outline"
          onClick={handleOpenFolder}
          aria-label={t('completion.openFolder')}
          className="gap-2"
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          {t('completion.openFolder')}
        </Button>

        {failedCount > 0 && canRetry && (
          <Button
            variant="default"
            onClick={handleRetryAll}
            disabled={isRetrying}
            aria-label={t('completion.retryFailed', { count: failedCount })}
            className="gap-2"
          >
            <RefreshCw
              className={cn('h-4 w-4', isRetrying && 'animate-spin')}
              aria-hidden="true"
            />
            {t('completion.retryFailed', { count: failedCount })}
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={onDownloadAnother}
          aria-label={t('completion.downloadAnother')}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('completion.downloadAnother')}
        </Button>
      </CardFooter>
    </Card>
  );
}
