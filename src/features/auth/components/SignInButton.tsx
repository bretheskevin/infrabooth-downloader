import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, RefreshCw, ExternalLink, Download } from 'lucide-react';
import { checkFirefoxInstalled, openInFirefox } from '@/features/auth/api';
import { useAuthCheck } from '@/features/auth/hooks/useAuthCheck';
import { useCookieWarning, WARNING_APPBOUND_ENCRYPTION } from '@/features/auth/store';
import { logger } from '@/lib/logger';
import { open } from '@tauri-apps/plugin-shell';

function AppboundWarningButtons() {
  const { t } = useTranslation();
  const { isChecking, handleCheck } = useAuthCheck();
  const [firefoxInstalled, setFirefoxInstalled] = useState(false);

  useEffect(() => {
    if (firefoxInstalled) return;
    const poll = () => checkFirefoxInstalled().then(setFirefoxInstalled).catch(() => setFirefoxInstalled(false));
    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  }, [firefoxInstalled]);

  const handleFirefoxAction = async () => {
    try {
      if (firefoxInstalled) {
        await openInFirefox();
      } else {
        await open('https://www.mozilla.org/firefox/new/');
      }
    } catch (e) {
      void logger.warn(`Failed to open Firefox: ${e}`);
      toast.error(t('auth.firefoxOpenError'));
    }
  };

  const FirefoxIcon = firefoxInstalled ? ExternalLink : Download;
  const firefoxLabel = firefoxInstalled ? t('auth.openInFirefox') : t('auth.downloadFirefox');

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleFirefoxAction} className="rounded-xl">
            <FirefoxIcon className="mr-2 h-4 w-4" />
            {firefoxLabel}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs mr-2">
          <p>{t('auth.cookieWarningAppbound')}</p>
          <p className="mt-1 text-primary-foreground/70">{t('auth.firefoxHint')}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCheck}
            disabled={isChecking}
            className="rounded-xl"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t('auth.retrySignIn')}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('auth.checkBrowser')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SignInButton() {
  const { t } = useTranslation();
  const { isChecking, handleCheck } = useAuthCheck();
  const cookieWarning = useCookieWarning();

  if (cookieWarning === WARNING_APPBOUND_ENCRYPTION) {
    return <AppboundWarningButtons />;
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
