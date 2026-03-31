import { useTranslation } from 'react-i18next';
import type { TrackInfo } from '@/bindings';
import { Spinner } from '@/components/ui/spinner';
import { CompletionPanel } from '@/features/completion';
import { ProgressPanel } from '@/features/progress/components/ProgressPanel';
import { useDownloadPipeline } from '../hooks/useDownloadPipeline';
import { DownloadMainView } from './DownloadMainView';

interface DownloadTabProps {
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function DownloadTab({ onDownloadTracks }: DownloadTabProps) {
  const { t } = useTranslation();
  const pipeline = useDownloadPipeline();

  switch (pipeline.type) {
    case 'complete':
      return (
        <section className="space-y-4">
          <CompletionPanel
            completedCount={pipeline.completion.completedCount}
            totalCount={pipeline.completion.totalCount}
            failedCount={pipeline.completion.failedCount}
            cancelledCount={pipeline.completion.cancelledCount}
            isCancelled={pipeline.completion.isCancelled}
            onDownloadAnother={pipeline.onDownloadAnother}
          />
        </section>
      );
    case 'processing':
      return (
        <section className="space-y-4">
          <ProgressPanel />
        </section>
      );
    case 'pending':
      return (
        <section className="space-y-4">
          <div
            className="flex flex-col items-center justify-center gap-4 py-16"
            data-testid="download-starting"
          >
            <Spinner className="h-12 w-12 text-primary" />
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">{t('download.startingDownload')}</p>
              <p className="text-sm text-muted-foreground">{t('download.preparingTracks')}</p>
            </div>
          </div>
        </section>
      );
    case 'main':
      return <DownloadMainView flow={pipeline.flow} onDownloadTracks={onDownloadTracks} />;
  }
}
