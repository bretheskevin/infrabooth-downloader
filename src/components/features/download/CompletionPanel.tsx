import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle, FolderOpen, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { openDownloadFolder } from '@/lib/shellCommands';
import { getDefaultDownloadPath } from '@/lib/settings';
import { logger } from '@/lib/logger';
import { SuccessMessage } from './SuccessMessage';
import { ErrorPanelTrigger } from './ErrorPanelTrigger';
import { ErrorPanel } from './ErrorPanel';
import { useFailedTracks } from '@/hooks/useFailedTracks';

interface CompletionPanelProps {
  completedCount: number;
  totalCount: number;
  failedCount: number;
  onDownloadAnother: () => void;
}

export function CompletionPanel({
  completedCount,
  totalCount,
  failedCount,
  onDownloadAnother,
}: CompletionPanelProps) {
  const { t } = useTranslation();
  const downloadPath = useSettingsStore((state) => state.downloadPath);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isErrorPanelOpen, setIsErrorPanelOpen] = useState(false);
  const failedTracks = useFailedTracks();

  const isFullSuccess = failedCount === 0;

  const handleOpenFolder = async () => {
    logger.info('[CompletionPanel] Open folder clicked');
    logger.debug(`[CompletionPanel] Current downloadPath from store: "${downloadPath}"`);

    let pathToOpen = downloadPath;

    if (!pathToOpen) {
      logger.debug('[CompletionPanel] No download path in store, fetching default');
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

  // Focus panel when it mounts for accessibility
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
          <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
            <CheckCircle
              className="h-8 w-8 text-emerald-500 motion-safe:animate-[checkmark-draw_0.3s_ease-out_forwards]"
              aria-hidden="true"
            />
          </div>

          <SuccessMessage
            completedCount={completedCount}
            totalCount={totalCount}
            isFullSuccess={isFullSuccess}
          />

          {failedCount > 0 && (
            <div className="w-full">
              <ErrorPanelTrigger
                failedCount={failedCount}
                onClick={handleToggleErrorPanel}
                isExpanded={isErrorPanelOpen}
              />
              <ErrorPanel
                failedTracks={failedTracks}
                isOpen={isErrorPanelOpen}
                onOpenChange={setIsErrorPanelOpen}
              />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-center gap-3 pb-6">
        <Button
          variant="outline"
          onClick={handleOpenFolder}
          aria-label={t('completion.openFolder')}
          className="gap-2"
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          {t('completion.openFolder')}
        </Button>

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
