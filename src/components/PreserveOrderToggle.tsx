import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore } from '@/features/settings/store';

interface PreserveOrderToggleProps {
  compact?: boolean;
}

export function PreserveOrderToggle({ compact = false }: PreserveOrderToggleProps) {
  const id = useId();
  const { t } = useTranslation();
  const preservePlaylistOrder = useSettingsStore((s) => s.preservePlaylistOrder);
  const setPreservePlaylistOrder = useSettingsStore((s) => s.setPreservePlaylistOrder);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Label
              htmlFor={id}
              className="text-xs text-muted-foreground cursor-pointer select-none whitespace-nowrap"
            >
              {t('download.preserveOrder')}
            </Label>
            <Switch
              id={id}
              checked={preservePlaylistOrder}
              onCheckedChange={setPreservePlaylistOrder}
              data-testid="preserve-order-switch"
              className="scale-90"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t('download.preserveOrderDescription')}
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
