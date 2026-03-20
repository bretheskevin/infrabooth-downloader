import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { TrackInfo } from '@/bindings';

function getErrorMessageKey(error: Error): string {
  const msg = error.message ?? '';
  if (msg.includes('Authentication required') || msg.includes('AuthRequired')) {
    return 'errors.authExpired';
  }
  if (msg.includes('Rate limited') || msg.includes('RateLimited')) {
    return 'library.rateLimited';
  }
  return 'library.detail.errorLoading';
}

interface PlaylistErrorStateProps {
  error: Error | null;
  tracks: TrackInfo[] | undefined;
  onRetry: () => void;
}

export function PlaylistErrorState({ error, tracks, onRetry }: PlaylistErrorStateProps) {
  const { t } = useTranslation();

  if (!error || tracks) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <p className="text-sm text-muted-foreground">{t(getErrorMessageKey(error))}</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        {t('library.detail.retry')}
      </Button>
    </div>
  );
}
