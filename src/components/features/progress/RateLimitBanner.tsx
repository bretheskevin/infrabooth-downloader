import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function RateLimitBanner() {
  const { t } = useTranslation();

  return (
    <Alert
      className="bg-amber-50 border-amber-200"
      role="status"
      aria-live="polite"
    >
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        {t('download.rateLimitMessage')}
      </AlertDescription>
    </Alert>
  );
}

export interface RateLimitBannerWithTransitionProps {
  isVisible: boolean;
}

export function RateLimitBannerWithTransition({
  isVisible,
}: RateLimitBannerWithTransitionProps) {
  return (
    <div
      data-testid="rate-limit-banner-wrapper"
      className={cn(
        'transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'
      )}
    >
      <RateLimitBanner />
    </div>
  );
}
