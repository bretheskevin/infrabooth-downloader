import { useTranslation } from 'react-i18next';
import { StatusDetails } from './StatusDetails';

export function UnavailableTrackDetails() {
  const { t } = useTranslation();

  return (
    <StatusDetails
      content={<p>{t('errors.trackUnavailableDetail')}</p>}
    />
  );
}
