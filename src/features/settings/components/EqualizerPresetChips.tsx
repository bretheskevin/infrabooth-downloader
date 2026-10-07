import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/features/settings/store';
import { BUILT_IN_EQUALIZER_PRESETS } from '@/features/settings/utils/equalizerPresets';

export function EqualizerPresetChips({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const preset = useSettingsStore((s) => s.equalizerPreset);

  return (
    <div role="group" aria-label={t('settings.equalizerPreset')} className="flex flex-1 flex-wrap gap-2">
      {BUILT_IN_EQUALIZER_PRESETS.map((id) => {
        const active = id === preset;
        return (
          <Button
            key={id}
            type="button"
            variant={active ? 'default' : 'secondary'}
            size="pill"
            className="shadow-none"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => useSettingsStore.getState().setEqualizerPreset(id)}
          >
            {t(`settings.equalizerPresets.${id}`)}
          </Button>
        );
      })}
    </div>
  );
}
