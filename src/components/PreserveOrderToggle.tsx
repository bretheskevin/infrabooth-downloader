import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Hash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/features/settings/store';

interface PreserveOrderToggleProps {
  variant?: 'default' | 'icon';
}

export function PreserveOrderToggle({ variant = 'default' }: PreserveOrderToggleProps) {
  const id = useId();
  const { t } = useTranslation();
  const preservePlaylistOrder = useSettingsStore((s) => s.preservePlaylistOrder);
  const setPreservePlaylistOrder = useSettingsStore((s) => s.setPreservePlaylistOrder);

  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setPreservePlaylistOrder(!preservePlaylistOrder)}
            className={cn(
              'inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors shrink-0',
              preservePlaylistOrder
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-pressed={preservePlaylistOrder}
            aria-label={t('download.preserveOrder')}
            data-testid="preserve-order-icon"
          >
            <Hash className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{t('download.preserveOrder')}</p>
          <p className="text-xs opacity-80">{t('download.preserveOrderDescription')}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <Label
          htmlFor={id}
          className="text-sm font-medium cursor-pointer"
        >
          {t('download.preserveOrder')}
        </Label>
        <span className="text-xs text-muted-foreground">
          {t('download.preserveOrderDescription')}
        </span>
      </div>
      <Switch
        id={id}
        checked={preservePlaylistOrder}
        onCheckedChange={setPreservePlaylistOrder}
        data-testid="preserve-order-switch"
      />
    </div>
  );
}
