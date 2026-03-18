import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '../store';

export function StreamModeSection() {
  const { t } = useTranslation();
  const streamMode = useSettingsStore((s) => s.streamMode);

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="stream-mode" className="text-base font-medium">
          {t('settings.streamMode')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.streamModeDescription')}
        </p>
      </div>
      <Switch
        id="stream-mode"
        checked={streamMode}
        onCheckedChange={useSettingsStore.getState().setStreamMode}
      />
    </div>
  );
}
