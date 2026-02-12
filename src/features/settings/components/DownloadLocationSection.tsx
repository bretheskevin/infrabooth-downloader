import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { FolderPicker } from './FolderPicker';

export function DownloadLocationSection() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-medium">
          {t('settings.downloadLocation')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.downloadLocationDescription')}
        </p>
      </div>

      <FolderPicker />
    </div>
  );
}
