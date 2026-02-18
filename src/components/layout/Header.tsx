import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { SettingsPanel } from '@/features/settings/components/SettingsPanel';
import { useMenuSettingsListener } from '@/features/settings/hooks/useMenuSettingsListener';

export function Header() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  useMenuSettingsListener(openSettings);

  return (
    <header className="bg-background border-b border-border/50">
      <div className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">{t('app.title')}</h1>
        </div>

        <div className="flex items-center gap-1">
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

      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
