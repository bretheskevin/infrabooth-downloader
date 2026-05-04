import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/features/settings';

export function ViewModeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.mediaViewMode);
  const setMode = useSettingsStore((s) => s.setMediaViewMode);

  return (
    <div
      role="group"
      aria-label={t('common.viewModeGroup')}
      className={cn('inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5', className)}
    >
      <ToggleButton active={mode === 'card'} onClick={() => setMode('card')} label={t('common.viewModeCard')}>
        <LayoutGrid className="h-4 w-4" />
      </ToggleButton>
      <ToggleButton active={mode === 'list'} onClick={() => setMode('list')} label={t('common.viewModeList')}>
        <List className="h-4 w-4" />
      </ToggleButton>
    </div>
  );
}

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ToggleButton({ active, onClick, label, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
