import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Info, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { open } from '@tauri-apps/plugin-shell';
import { logger } from '@/lib/logger';
import { useUpdateStore } from '../store';

const RELEASES_BASE_URL =
  'https://github.com/bretheskevin/infrabooth-downloader/releases';

export function UpdateBanner() {
  const { t } = useTranslation();
  const {
    updateAvailable,
    updateInfo,
    dismissed,
    installing,
    installError,
    installed,
    installUpdate,
    dismissUpdate,
  } = useUpdateStore(
    useShallow((s) => ({
      updateAvailable: s.updateAvailable,
      updateInfo: s.updateInfo,
      dismissed: s.dismissed,
      installing: s.installing,
      installError: s.installError,
      installed: s.installed,
      installUpdate: s.installUpdate,
      dismissUpdate: s.dismissUpdate,
    }))
  );

  if (!updateAvailable || dismissed || !updateInfo) {
    return null;
  }

  const releaseUrl = `${RELEASES_BASE_URL}/tag/v${updateInfo.version}`;

  const handleLearnMore = () => {
    open(releaseUrl).catch(() => {
      open(RELEASES_BASE_URL).catch((e) => void logger.warn(`[Update] Failed to open releases URL: ${e instanceof Error ? e.message : String(e)}`));
    });
  };

  const variant = installed
    ? {
        bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
        text: 'text-green-800 dark:text-green-200',
        icon: 'text-green-600 dark:text-green-400',
        Icon: CheckCircle,
        label: t('update.installed'),
      }
    : installError
      ? {
          bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
          text: 'text-amber-800 dark:text-amber-200',
          icon: 'text-amber-600 dark:text-amber-400',
          Icon: Info,
          label: t('update.installError'),
        }
      : {
          bg: 'bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800',
          text: 'text-sky-800 dark:text-sky-200',
          icon: 'text-sky-600 dark:text-sky-400',
          Icon: Info,
          label: t('update.available', { version: updateInfo.version }),
        };

  return (
    <Alert
      className={`${variant.bg} rounded-none border-x-0 border-t-0`}
      role="status"
      aria-live="polite"
    >
      <variant.Icon className={`h-4 w-4 ${variant.icon}`} />
      <AlertDescription className={`flex items-center justify-between flex-1 ${variant.text}`}>
        <span>{variant.label}</span>
        <div className="flex items-center gap-2">
          {!installed && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={installUpdate}
                disabled={installing}
                className="h-7 text-xs"
              >
                {installing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {installing ? t('update.installing') : t('update.updateNow')}
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={handleLearnMore}
                disabled={installing}
                className="text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
              >
                {t('update.learnMore')}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissUpdate}
            aria-label={t('update.dismiss')}
            className={`h-6 w-6 ${variant.icon} hover:opacity-80`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
