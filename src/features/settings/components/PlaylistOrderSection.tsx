import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/features/settings/store';

export function PlaylistOrderSection() {
  const { t } = useTranslation();
  const preservePlaylistOrder = useSettingsStore((s) => s.preservePlaylistOrder);
  const setPreservePlaylistOrder = useSettingsStore((s) => s.setPreservePlaylistOrder);

  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-base font-medium">
          {t('settings.preserveOrder')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.preserveOrderDescription')}
        </p>
      </div>
      <Switch
        checked={preservePlaylistOrder}
        onCheckedChange={setPreservePlaylistOrder}
        data-testid="settings-preserve-order-switch"
      />
    </div>
  );
}
