import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { FolderPicker } from './FolderPicker';

export function DownloadLocationSection() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3" data-testid="download-location-section">
      <div className="space-y-1">
        <Label>{t('settings.downloadLocation')}</Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.downloadLocationDescription')}
        </p>
      </div>
      <FolderPicker />
    </div>
  );
}
