import { useTranslation } from 'react-i18next';
import { StatusTooltip } from './StatusTooltip';

export interface UnavailableTrackTooltipProps {
  children: React.ReactNode;
}

export function UnavailableTrackTooltip({ children }: UnavailableTrackTooltipProps) {
  const { t } = useTranslation();

  return (
    <StatusTooltip
      descriptionId="unavailable-track-description"
      mainText={t('errors.trackUnavailableDetail')}
    >
      {children}
    </StatusTooltip>
  );
}
