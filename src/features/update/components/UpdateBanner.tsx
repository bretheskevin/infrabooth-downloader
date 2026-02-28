import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { open } from '@tauri-apps/plugin-shell';
import { useUpdateStore } from '../store';

const RELEASES_BASE_URL =
  'https://github.com/bretheskevin/infrabooth-downloader/releases';

export function UpdateBanner() {
  const { t } = useTranslation();
  const { updateAvailable, updateInfo, dismissed, dismissUpdate } = useUpdateStore(
    useShallow((s) => ({
      updateAvailable: s.updateAvailable,
      updateInfo: s.updateInfo,
      dismissed: s.dismissed,
      dismissUpdate: s.dismissUpdate,
    }))
  );

  if (!updateAvailable || dismissed || !updateInfo) {
    return null;
  }

  const releaseUrl = `${RELEASES_BASE_URL}/tag/v${updateInfo.version}`;

  const handleLearnMore = () => {
    open(releaseUrl).catch(() => {
      // Fallback to releases list if specific tag URL fails
      open(RELEASES_BASE_URL).catch((e) => console.warn('[Update] Failed to open releases URL:', e));
    });
  };

  return (
    <Alert
      className="bg-sky-50 border-sky-200 rounded-none border-x-0 border-t-0 dark:bg-sky-950/30 dark:border-sky-800"
      role="status"
      aria-live="polite"
    >
      <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
      <AlertDescription className="flex items-center justify-between flex-1 text-sky-800 dark:text-sky-200">
        <span>{t('update.available', { version: updateInfo.version })}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="link"
            size="sm"
            onClick={handleLearnMore}
            className="text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
          >
            {t('update.learnMore')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissUpdate}
            aria-label={t('update.dismiss')}
            className="h-6 w-6 text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
