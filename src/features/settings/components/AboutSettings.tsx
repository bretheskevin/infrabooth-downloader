import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, Lightbulb } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChangelogDialog } from '@/features/changelog';
import { useAppVersion } from '@/hooks';
import { getAppDataPath, getLogPath } from '@/features/settings/api/settings';
import { type IssueType, buildGitHubIssueUrl } from '@/lib/github';
import { logger } from '@/lib/logger';
import { openDownloadFolder } from '@/lib/shellCommands';

export function AboutSettings() {
  const { t, i18n } = useTranslation();
  const appVersion = useAppVersion();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [appDataPath, setAppDataPath] = useState('');
  const [logPath, setLogPath] = useState('');

  useEffect(() => {
    getAppDataPath()
      .then(setAppDataPath)
      .catch((e) => {
        void logger.error(`[AboutSettings] Failed to get app data path: ${e}`);
      });
    getLogPath()
      .then(setLogPath)
      .catch((e) => {
        void logger.error(`[AboutSettings] Failed to get log path: ${e}`);
      });
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

  const openIssue = (type: IssueType) => open(buildGitHubIssueUrl(type, { appVersion: appVersion || 'unknown', lang: i18n.language }));

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

      {(appDataPath || logPath) && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('settings.locationsSection')}</h3>
          {appDataPath && (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-sm">{t('settings.appDataFolder')}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{appDataPath}</p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start">
                    {appDataPath}
                  </TooltipContent>
                </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">{logPath}</p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start">
                    {logPath}
                  </TooltipContent>
                </Tooltip>
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
        </div>
      )}

      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('settings.feedbackSection')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => openIssue('bug')}>
            <Bug className="mr-2 h-4 w-4" />
            {t('settings.reportBug')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openIssue('feature')}>
            <Lightbulb className="mr-2 h-4 w-4" />
            {t('settings.suggestFeature')}
          </Button>
        </div>
      </div>

      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
}
