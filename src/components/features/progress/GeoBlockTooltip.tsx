import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface GeoBlockTooltipProps {
  children: React.ReactNode;
}

export function GeoBlockTooltip({ children }: GeoBlockTooltipProps) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          className="max-w-xs bg-slate-800 text-slate-100"
          aria-describedby="geo-block-description"
        >
          <p id="geo-block-description">{t('errors.geoBlockedDetail')}</p>
          <p className="text-xs text-slate-400 mt-1">
            {t('errors.geoBlockedNoRetry')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
