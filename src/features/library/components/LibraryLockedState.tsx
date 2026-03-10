import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LibraryLockedState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-full bg-secondary p-3">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{t('library.lockedTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('library.lockedDescription')}</p>
      </div>
    </div>
  );
}
