import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { MessageBell } from '@/features/messages';
import { useIsSignedIn } from '@/features/auth/store';
import { SettingsDialog } from '@/features/settings/components/SettingsDialog';
import { useMenuSettingsListener } from '@/features/settings/hooks/useMenuSettingsListener';
import { useAppVersion } from '@/hooks';

export function Header() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const appVersion = useAppVersion();

  const isSignedIn = useIsSignedIn();
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  useMenuSettingsListener(openSettings);

  return (
    <header data-testid="header" className="bg-background border-b border-border/50">
      <div className="flex items-center justify-between px-6 py-4 container mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight whitespace-nowrap">{t('app.title')}</h1>
            {appVersion && <span className="text-xs text-muted-foreground">{t('app.version', { version: appVersion })}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSignedIn && <MessageBell />}
          {isSignedIn && <NotificationBell />}
          <AuthContainer />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings.openSettings', 'Open settings')}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
