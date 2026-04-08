import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { checkAuth, restartAsAdmin } from '@/features/auth/api';
import { useCookieWarning, WARNING_APPBOUND_ENCRYPTION } from '@/features/auth/store';
import { logger } from '@/lib/logger';

export function SignInButton() {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const cookieWarning = useCookieWarning();

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await checkAuth();
    } catch {
      // Auth check failed — state event handles UI update
    } finally {
      setIsChecking(false);
    }
  };

  const handleRestartAsAdmin = async () => {
    try {
      await restartAsAdmin();
    } catch (e) {
      void logger.warn(`UAC elevation failed: ${e}`);
    }
  };

  if (cookieWarning === WARNING_APPBOUND_ENCRYPTION) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestartAsAdmin}
            className="rounded-xl"
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            {t('auth.restartAsAdmin')}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs mr-2">
          <p>{t('auth.cookieWarningAppbound')}</p>
          <p className="mt-1 text-muted-foreground">{t('auth.useFirefoxHint')}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheck}
          disabled={isChecking}
          className="rounded-xl"
        >
          {isChecking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isChecking ? t('auth.checking') : t('auth.checkBrowser')}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs mr-2">
        <p>{t('auth.signInHint')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
