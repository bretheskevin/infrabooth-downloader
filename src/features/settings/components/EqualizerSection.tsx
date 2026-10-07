import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/features/settings/store';
import { EqualizerGraph } from './EqualizerGraph';
import { EqualizerPresetChips } from './EqualizerPresetChips';

export function EqualizerSection() {
  const { t } = useTranslation();
  const equalizerEnabled = useSettingsStore((s) => s.equalizerEnabled);
  const disabled = !equalizerEnabled;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="equalizer" className="text-base font-medium">
            {t('settings.equalizer')}
          </Label>
          <p className="text-sm text-muted-foreground">{t('settings.equalizerDescription')}</p>
        </div>
        <Switch id="equalizer" checked={equalizerEnabled} onCheckedChange={useSettingsStore.getState().setEqualizerEnabled} />
      </div>
      <div className="space-y-4 pl-4">
        <div className="flex items-start justify-between gap-3">
          <EqualizerPresetChips disabled={disabled} />
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => useSettingsStore.getState().resetEqualizer()}>
            {t('settings.equalizerReset')}
          </Button>
        </div>
        <EqualizerGraph disabled={disabled} />
      </div>
    </div>
  );
}
