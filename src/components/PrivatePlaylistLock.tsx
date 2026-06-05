import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function PrivatePlaylistLock({ className }: { className?: string }) {
  const { t } = useTranslation();
  return <Lock aria-label={t('playlist.private')} className={cn('text-muted-foreground shrink-0', className)} />;
}
