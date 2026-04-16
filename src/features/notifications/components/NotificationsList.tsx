import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationRow } from './NotificationRow';
import { useNotificationsPage } from '../hooks/useNotificationsPage';
import { useMarkNotificationsSeen } from '../hooks/useMarkNotificationsSeen';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface NotificationsListProps {
  containerClassName: string;
  sentinelClassName?: string;
  onClose: () => void;
  markSeen?: boolean;
}

export function NotificationsList({ containerClassName, sentinelClassName, onClose, markSeen = false }: NotificationsListProps) {
  const { t } = useTranslation();
  const { items, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useNotificationsPage();
  useMarkNotificationsSeen(items, markSeen);
  const { sentinelRef } = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 px-4">
        <p className="text-sm text-muted-foreground">{t('notifications.error')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t('notifications.retry')}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {items.map((item) => (
        <NotificationRow key={item.id} item={item} onClose={onClose} />
      ))}
      <div ref={sentinelRef} className={sentinelClassName ?? 'h-1'} />
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
