import { AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorPanelTriggerProps {
  failedCount: number;
  onClick: () => void;
  onRetryAll?: () => void;
  isExpanded?: boolean;
  isRetrying?: boolean;
}

export function ErrorPanelTrigger({
  failedCount,
  onClick,
  onRetryAll,
  isExpanded = false,
  isRetrying = false,
}: ErrorPanelTriggerProps) {
  const { t } = useTranslation();

  if (failedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg p-3',
        'border border-warning/30 bg-warning/5',
        'dark:border-warning/20 dark:bg-warning/10'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-4 w-4 flex-shrink-0 text-warning"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">
            {t('completion.tracksNeedAttention', { count: failedCount })}
          </span>
        </div>

        {onRetryAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryAll}
            disabled={isRetrying}
            className="h-7 gap-1.5 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')}
              aria-hidden="true"
            />
            {t('completion.retryAll')}
          </Button>
        )}
      </div>

      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1.5 text-xs text-muted-foreground',
          'transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 rounded'
        )}
        aria-expanded={isExpanded}
        aria-controls="error-panel-content"
      >
        <span>{isExpanded ? t('errors.closePanel') : t('completion.viewFailed')}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
