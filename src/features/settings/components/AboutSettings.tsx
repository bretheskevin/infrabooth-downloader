import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChangelogDialog } from '@/features/changelog';
import { useAppVersion } from '@/hooks';

export function AboutSettings() {
  const { t } = useTranslation();
  const appVersion = useAppVersion();
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <div className="space-y-6">
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
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  );
}
