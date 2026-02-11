import { useTranslation } from 'react-i18next';
import { StatusTooltip } from './StatusTooltip';

export interface GeoBlockTooltipProps {
  children: React.ReactNode;
}

export function GeoBlockTooltip({ children }: GeoBlockTooltipProps) {
  const { t } = useTranslation();

  return (
    <StatusTooltip
      descriptionId="geo-block-description"
      mainText={t('errors.geoBlockedDetail')}
      subText={t('errors.geoBlockedNoRetry')}
    >
      {children}
    </StatusTooltip>
  );
}
