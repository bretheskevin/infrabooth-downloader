import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { User, Loader2 } from 'lucide-react';

export function UserBadge() {
  const { t } = useTranslation();
  const username = useAuthStore((state) => state.username);
  const plan = useAuthStore((state) => state.plan);
  const isGoPlus = plan != null && plan !== '';

  // Show loading state while profile is being fetched
  if (!username) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{t('auth.loading', 'Loading...')}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={t('auth.accessibilityStatus', { username })}
    >
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm text-foreground">
          {t('auth.signedInAs', { username })}
        </span>
      </div>
      {isGoPlus && (
        <Badge
          variant="secondary"
          className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
        >
          {t('auth.qualityBadge', 'Go+ 256kbps')}
        </Badge>
      )}
    </div>
  );
}
