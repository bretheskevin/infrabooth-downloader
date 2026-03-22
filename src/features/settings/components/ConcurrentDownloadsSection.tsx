import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export function ConcurrentDownloadsSection() {
  const { t } = useTranslation();
  const maxConcurrentDownloads = useSettingsStore((state) => state.maxConcurrentDownloads);
  const setMaxConcurrentDownloads = useSettingsStore.getState().setMaxConcurrentDownloads;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-medium">
          {t('settings.concurrentDownloads')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.concurrentDownloadsDescription')}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          aria-label={t('settings.concurrentDownloads')}
          value={[maxConcurrentDownloads]}
          onValueChange={([v]) => v !== undefined && setMaxConcurrentDownloads(v)}
          min={1}
          max={10}
          step={1}
          className="flex-1"
        />
        <span className="text-sm font-mono w-6 text-right">{maxConcurrentDownloads}</span>
      </div>
    </div>
  );
}
