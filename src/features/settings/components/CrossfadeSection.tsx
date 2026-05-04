import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore } from '../store';

export function CrossfadeSection() {
  const { t } = useTranslation();
  const crossfadeEnabled = useSettingsStore((s) => s.crossfadeEnabled);
  const crossfadeDuration = useSettingsStore((s) => s.crossfadeDuration);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="crossfade" className="text-base font-medium">
            {t('settings.crossfade')}
          </Label>
          <p className="text-sm text-muted-foreground">{t('settings.crossfadeDescription')}</p>
        </div>
        <Switch id="crossfade" checked={crossfadeEnabled} onCheckedChange={useSettingsStore.getState().setCrossfadeEnabled} />
      </div>
      {crossfadeEnabled && (
        <div className="space-y-2 pl-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('settings.crossfadeDuration')}</span>
            <span className="text-sm font-mono w-6 text-right">{t('settings.crossfadeSeconds', { count: crossfadeDuration })}</span>
          </div>
          <Slider
            aria-label={t('settings.crossfadeDuration')}
            min={1}
            max={12}
            step={1}
            value={[crossfadeDuration]}
            onValueChange={([v]) => v !== undefined && useSettingsStore.getState().setCrossfadeDuration(v)}
          />
        </div>
      )}
    </div>
  );
}
