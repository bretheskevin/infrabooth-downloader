import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { ConcurrentDownloadsSection } from './ConcurrentDownloadsSection';
import { PlaylistOrderSection } from './PlaylistOrderSection';

export function PlaylistsSettings() {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="text-lg font-semibold">{t('settings.categoryPlaylists')}</h2>
      <ConcurrentDownloadsSection />
      <Separator />
      <PlaylistOrderSection />
    </>
  );
}
