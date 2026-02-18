import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  isExpanded = false,
}: ErrorPanelTriggerProps) {
  const { t } = useTranslation();

  if (failedCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between gap-3 rounded-xl p-4',
        'border border-warning/30 bg-warning/5',
        'dark:border-warning/20 dark:bg-warning/10',
        'transition-colors hover:bg-warning/10',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      aria-expanded={isExpanded}
      aria-controls="error-panel-content"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle
          className="h-4 w-4 flex-shrink-0 text-warning"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-foreground">
          {t('completion.tracksNeedAttention', { count: failedCount })}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{isExpanded ? t('errors.closePanel') : t('completion.viewFailed')}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
