import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProgressPanel } from '@/features/progress/components/ProgressPanel';
import { CompletionPanel } from '@/features/completion/components/CompletionPanel';
import { useQueueStore } from '@/features/queue';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { useRecordDownloadHistory } from '@/features/download-history';

interface DownloadDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadDashboard({ isOpen, onClose }: DownloadDashboardProps) {
  const { t } = useTranslation();
  const isWidescreen = useIsWidescreen();
  useRecordDownloadHistory();

  const { isComplete, isProcessing, completedCount, failedCount, cancelledCount, isCancelled, totalTracks, tracks } = useQueueStore(
    useShallow((s) => ({
      isComplete: s.isComplete,
      isProcessing: s.isProcessing,
      completedCount: s.completedCount,
      failedCount: s.failedCount,
      cancelledCount: s.cancelledCount,
      isCancelled: s.isCancelled,
      totalTracks: s.totalTracks,
      tracks: s.tracks,
    })),
  );

  const handleDownloadAnother = () => {
    useQueueStore.getState().clearQueue();
    onClose();
  };

  const hasContent = tracks.length > 0 || isComplete || isProcessing;
  const sheetSide = isWidescreen ? 'right' : 'bottom';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={sheetSide}
        className={isWidescreen ? 'flex flex-col overflow-hidden w-[540px] sm:max-w-[540px]' : 'flex flex-col overflow-hidden h-[85vh]'}
      >
        <SheetHeader className="shrink-0">
          <SheetTitle>{t('download.dashboard.title')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto mt-4">
          {!hasContent ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              {t('download.dashboard.noActiveDownloads')}
            </div>
          ) : isComplete ? (
            <CompletionPanel
              completedCount={completedCount}
              totalCount={totalTracks}
              failedCount={failedCount}
              cancelledCount={cancelledCount}
              isCancelled={isCancelled}
              onDownloadAnother={handleDownloadAnother}
            />
          ) : (
            <ProgressPanel />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
