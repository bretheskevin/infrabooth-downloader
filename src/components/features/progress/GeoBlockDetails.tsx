import { useTranslation } from 'react-i18next';
import { StatusDetails } from './StatusDetails';

export function GeoBlockDetails() {
  const { t } = useTranslation();

  return (
    <StatusDetails
      content={
        <div className="space-y-0.5">
          <p>{t('errors.geoBlockedDetail')}</p>
          <p>{t('errors.geoBlockedNoRetry')}</p>
        </div>
      }
    />
  );
}
