import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ErrorPanelTriggerProps {
  failedCount: number;
  onClick: () => void;
  isExpanded?: boolean;
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
        'flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded-md px-2 py-1'
      )}
      aria-expanded={isExpanded}
      aria-controls="error-panel-content"
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>{t('errors.tracksFailed', { count: failedCount })}</span>
      <ChevronDown
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}
        aria-hidden="true"
      />
    </button>
  );
}
