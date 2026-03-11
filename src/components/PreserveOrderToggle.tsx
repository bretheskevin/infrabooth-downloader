import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/features/settings/store';

export function PreserveOrderToggle() {
  const { t } = useTranslation();
  const preservePlaylistOrder = useSettingsStore((s) => s.preservePlaylistOrder);
  const setPreservePlaylistOrder = useSettingsStore((s) => s.setPreservePlaylistOrder);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <Label
          htmlFor="preserve-order"
          className="text-sm font-medium cursor-pointer"
        >
          {t('download.preserveOrder')}
        </Label>
        <span className="text-xs text-muted-foreground">
          {t('download.preserveOrderDescription')}
        </span>
      </div>
      <Switch
        id="preserve-order"
        checked={preservePlaylistOrder}
        onCheckedChange={setPreservePlaylistOrder}
        data-testid="preserve-order-switch"
      />
    </div>
  );
}
