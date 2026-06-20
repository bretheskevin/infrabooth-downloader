import { useTranslation } from 'react-i18next';
import { X, ChevronUp, Loader2, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import type { DownloadDockState, DockStatus } from '../hooks/useDownloadDockState';

interface DockStatusContentProps {
  status: DockStatus;
  percentage: number;
  doneCount: number;
  totalTracks: number;
  completedCount: number;
  failedCount: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function DockStatusContent({ status, percentage, doneCount, totalTracks, completedCount, failedCount, t }: DockStatusContentProps) {
  if (status === 'initializing') {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">{t('download.dock.preparing')}</span>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2">
        <Ban className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{t('download.dock.cancelled')}</span>
      </div>
    );
  }

  if (status === 'complete') {
    const hasFailures = failedCount > 0;
    return (
      <div className="flex items-center gap-2">
        {hasFailures ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
        <span className="text-sm font-medium">
          {hasFailures
            ? t('download.dock.completeWithFailures', { completed: completedCount, failed: failedCount })
            : t('download.dock.complete')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
      <span className="text-sm font-medium shrink-0">{t('download.dock.progressOf', { current: doneCount, total: totalTracks })}</span>
      <Progress value={percentage} className="flex-1 h-2" />
      <span className="text-xs text-muted-foreground shrink-0">{percentage}%</span>
    </div>
  );
}

interface DownloadDockProps {
  dockState: DownloadDockState;
}

export function DownloadDock({ dockState }: DownloadDockProps) {
  const isWidescreen = useIsWidescreen();
  const { t } = useTranslation();

  if (!dockState.isVisible) return null;

  const showDismiss = dockState.status === 'complete' || dockState.status === 'cancelled';

  return (
    <Card
      className={cn(
        'fixed z-40 shadow-lg border',
        'transition-all duration-300 ease-out',
        'animate-in slide-in-from-bottom-4 fade-in',
        isWidescreen ? 'bottom-4 right-4 w-96 p-3' : 'bottom-0 left-0 right-0 rounded-none border-x-0 border-b-0 p-3',
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <DockStatusContent
            status={dockState.status}
            percentage={dockState.percentage}
            doneCount={dockState.doneCount}
            totalTracks={dockState.totalTracks}
            completedCount={dockState.completedCount}
            failedCount={dockState.failedCount}
            t={t}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={dockState.openDashboard}
            aria-label={t('download.dock.openDashboard')}
            className="h-7 px-2 gap-2"
          >
            <span className="sr-only md:not-sr-only text-xs">{t('download.dock.openDashboard')}</span>
            <ChevronUp className="h-4 w-4" />
          </Button>

          {showDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dockState.dismissDock}
              aria-label={t('download.dock.dismiss')}
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
