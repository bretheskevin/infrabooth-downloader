import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { LanguageSection } from './LanguageSection';
import { ThemeSection } from './ThemeSection';
import { DownloadLocationSection } from './DownloadLocationSection';

export function GeneralSettings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t('settings.categoryGeneral')}</h2>
      <LanguageSection />
      <Separator />
      <ThemeSection />
      <Separator />
      <DownloadLocationSection />
    </div>
  );
}
