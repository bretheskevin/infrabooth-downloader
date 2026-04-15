import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChangelogDialog } from '@/features/changelog';
import { useAppVersion } from '@/hooks';
import { getAppDataPath, getLogPath } from '@/features/settings/api/settings';
import { logger } from '@/lib/logger';
import { openDownloadFolder } from '@/lib/shellCommands';

export function AboutSettings() {
  const { t } = useTranslation();
  const appVersion = useAppVersion();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [appDataPath, setAppDataPath] = useState('');
  const [logPath, setLogPath] = useState('');

  useEffect(() => {
    getAppDataPath().then(setAppDataPath).catch((e) => { void logger.error(`[AboutSettings] Failed to get app data path: ${e}`); });
    getLogPath().then(setLogPath).catch((e) => { void logger.error(`[AboutSettings] Failed to get log path: ${e}`); });
  }, []);

  const handleOpenAppData = async () => {
    if (appDataPath) {
      try {
        await openDownloadFolder(appDataPath);
      } catch (error) {
        void logger.error(`[AboutSettings] Failed to open app data folder: ${error}`);
      }
    }
  };

  const handleOpenLogs = async () => {
    if (logPath) {
      try {
        await openDownloadFolder(logPath);
      } catch (error) {
        void logger.error(`[AboutSettings] Failed to open log folder: ${error}`);
      }
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold">{t('settings.categoryAbout')}</h2>
      <div className="flex items-center justify-between">
        <span className="text-sm">{t('app.version', { version: appVersion || '...' })}</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setChangelogOpen(true)}
        >
          {t('settings.viewChangelog')}
        </Button>
      </div>
      {appDataPath && (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-sm">{t('settings.appDataFolder')}</span>
            <p className="text-[10px] text-muted-foreground">{appDataPath}</p>
          </div>
          <Button
            variant="link"
            size="sm"
            className="h-auto shrink-0 p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleOpenAppData}
          >
            {t('settings.openFolder')}
          </Button>
        </div>
      )}
      {logPath && (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-sm">{t('settings.logFolder')}</span>
            <p className="text-[10px] text-muted-foreground">{logPath}</p>
          </div>
          <Button
            variant="link"
            size="sm"
            className="h-auto shrink-0 p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleOpenLogs}
          >
            {t('settings.openFolder')}
          </Button>
        </div>
      )}
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
}