import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface UnavailableTrackTooltipProps {
  children: React.ReactNode;
}

export function UnavailableTrackTooltip({ children }: UnavailableTrackTooltipProps) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          className="max-w-xs bg-slate-800 text-slate-100"
          aria-describedby="unavailable-track-description"
        >
          <p id="unavailable-track-description">{t('errors.trackUnavailableDetail')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
