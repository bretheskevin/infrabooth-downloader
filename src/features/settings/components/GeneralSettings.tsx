import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { LanguageSection } from './LanguageSection';
import { ThemeSection } from './ThemeSection';
import { DownloadLocationSection } from './DownloadLocationSection';
import { StreamModeSection } from './StreamModeSection';
import { useIsDownloadEnabled } from '../hooks/useIsDownloadEnabled';

export function GeneralSettings() {
  const { t } = useTranslation();
  const isDownloadEnabled = useIsDownloadEnabled();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t('settings.categoryGeneral')}</h2>
      <LanguageSection />
      <Separator />
      <ThemeSection />
      <Separator />
      <StreamModeSection />
      {isDownloadEnabled && (
        <>
          <Separator />
          <DownloadLocationSection />
        </>
      )}
    </div>
  );
}
