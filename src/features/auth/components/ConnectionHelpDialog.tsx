import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-shell';
import { Loader2, ExternalLink, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore, useCookieWarning, WARNING_APPBOUND_ENCRYPTION } from '@/features/auth/store';
import { checkFirefoxInstalled, openInFirefox } from '@/features/auth/api';
import { useAuthCheck } from '@/features/auth/hooks/useAuthCheck';
import { logger } from '@/lib/logger';

function DefaultModeContent({ onCheckAgain, isChecking }: { onCheckAgain: () => void; isChecking: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader className="p-6 pb-2">
        <DialogTitle>{t('auth.connectHelp.title')}</DialogTitle>
        <DialogDescription>{t('auth.connectHelp.description')}</DialogDescription>
      </DialogHeader>
      <div className="px-6 pb-4 space-y-4">
        <ol className="space-y-2 text-sm list-decimal list-inside">
          <li>{t('auth.connectHelp.step1')}</li>
          <li>{t('auth.connectHelp.step2')}</li>
          <li>{t('auth.connectHelp.step3')}</li>
        </ol>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void open('https://soundcloud.com')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('auth.connectHelp.openSoundcloud')}
          </Button>
          <Button variant="default" size="sm" onClick={onCheckAgain} disabled={isChecking}>
            {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('auth.connectHelp.checkAgain')}
          </Button>
        </div>
      </div>
    </>
  );
}

function AppboundModeContent({ onCheckAgain, isChecking }: { onCheckAgain: () => void; isChecking: boolean }) {
  const { t } = useTranslation();
  const [firefoxInstalled, setFirefoxInstalled] = useState(false);

  useEffect(() => {
    if (firefoxInstalled) return;
    const poll = () =>
      checkFirefoxInstalled()
        .then(setFirefoxInstalled)
        .catch((e) => {
          void logger.warn(`[ConnectionHelpDialog] Firefox install check failed: ${e}`);
          setFirefoxInstalled(false);
        });
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
      void logger.warn(`[ConnectionHelpDialog] failed to open Firefox: ${e}`);
      toast.error(t('auth.firefoxOpenError'));
    }
  };

  const FirefoxIcon = firefoxInstalled ? ExternalLink : Download;
  const firefoxLabel = firefoxInstalled ? t('auth.openInFirefox') : t('auth.downloadFirefox');

  return (
    <>
      <DialogHeader className="p-6 pb-2">
        <DialogTitle>{t('auth.connectHelp.appbound.title')}</DialogTitle>
        <DialogDescription>{t('auth.connectHelp.appbound.description')}</DialogDescription>
      </DialogHeader>
      <div className="px-6 pb-4 space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleFirefoxAction()}>
            <FirefoxIcon className="mr-2 h-4 w-4" />
            {firefoxLabel}
          </Button>
          <Button variant="default" size="sm" onClick={onCheckAgain} disabled={isChecking}>
            {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('auth.connectHelp.checkAgain')}
          </Button>
        </div>
      </div>
    </>
  );
}

export function ConnectionHelpDialog() {
  const isOpen = useAuthStore((s) => s.isConnectHelpOpen);
  const cookieWarning = useCookieWarning();
  const { isChecking, handleCheck } = useAuthCheck();

  const handleClose = () => {
    useAuthStore.getState().closeConnectHelp();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {isOpen &&
          (cookieWarning === WARNING_APPBOUND_ENCRYPTION ? (
            <AppboundModeContent onCheckAgain={handleCheck} isChecking={isChecking} />
          ) : (
            <DefaultModeContent onCheckAgain={handleCheck} isChecking={isChecking} />
          ))}
      </DialogContent>
    </Dialog>
  );
}
