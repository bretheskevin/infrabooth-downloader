import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { SettingsPanel } from '@/features/settings/components/SettingsPanel';

export function Header() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <h1 className="text-lg font-semibold">{t('app.title')}</h1>

      <div className="flex items-center gap-2">
        <AuthContainer />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('settings.openSettings', 'Open settings')}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </header>
  );
}
