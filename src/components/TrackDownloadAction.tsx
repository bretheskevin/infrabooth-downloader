import { useTranslation } from 'react-i18next';
import { Check, Download, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DownloadState } from '@/types/download';

interface TrackDownloadActionProps {
  state: DownloadState;
  onDownload: () => void;
  onRetry: () => void;
  variant?: 'ghost' | 'filled';
}

export function TrackDownloadAction({ state, onDownload, onRetry, variant = 'ghost' }: TrackDownloadActionProps) {
  const { t } = useTranslation();

  if (state.status === 'idle') {
    if (variant === 'ghost') {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onDownload}
          aria-label={t('library.detail.download')}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      );
    }
    return (
      <button
        type="button"
        onClick={onDownload}
        aria-label={t('library.detail.download')}
        className="h-8 w-8 rounded-md bg-secondary/70 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Download className="h-4 w-4" />
      </button>
    );
  }

  if (state.status === 'downloading') {
    if ((state.progress ?? 0) > 0) {
      return <span className="text-xs font-medium text-primary tabular-nums">{Math.round(state.progress! * 100)}%</span>;
    }
    return (
      <div className="h-8 w-8 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  if (state.status === 'completed') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="h-8 w-8 rounded-md bg-green-50 dark:bg-green-950/30 flex items-center justify-center text-green-600"
            aria-label={t('library.detail.alreadyDownloaded')}
          >
            <Check className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{t('library.detail.alreadyDownloaded')}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (state.status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        aria-label={t('common.retry')}
        className="h-8 w-8 rounded-md bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors"
      >
        <RotateCw className="h-4 w-4" />
      </button>
    );
  }

  return null;
}
