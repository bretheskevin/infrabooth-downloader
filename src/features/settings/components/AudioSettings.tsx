import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { CrossfadeSection } from './CrossfadeSection';
import { EqualizerSection } from './EqualizerSection';

export function AudioSettings() {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="text-lg font-semibold">{t('settings.categoryAudio')}</h2>
      <CrossfadeSection />
      <Separator />
      <EqualizerSection />
    </>
  );
}
