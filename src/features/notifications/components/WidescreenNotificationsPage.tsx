import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/FilterChips';
import type { NotificationItem } from '@/bindings';
import { NotificationRow } from './NotificationRow';
import { useNotificationsPage } from '../hooks/useNotificationsPage';
import { useMarkNotificationsSeen } from '../hooks/useMarkNotificationsSeen';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

type FilterKey = 'all' | 'mentions' | 'likes' | 'follows';

const FILTER_OPTIONS: readonly { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'notifications.filter.all' },
  { key: 'mentions', label: 'notifications.filter.mentions' },
  { key: 'likes', label: 'notifications.filter.likes' },
  { key: 'follows', label: 'notifications.filter.follows' },
] as const;

const FILTER_KINDS: Record<FilterKey, NotificationItem['kind'][] | null> = {
  all: null,
  mentions: ['mention', 'comment'],
  likes: ['track_like', 'playlist_like'],
  follows: ['affiliation'],
};

const noop = () => {};

export function WidescreenNotificationsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterKey>('all');
  const { items, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useNotificationsPage();
  useMarkNotificationsSeen(items, true);
  const { sentinelRef } = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  const filteredItems = useMemo(() => {
    const kinds = FILTER_KINDS[filter];
    if (!kinds) return items;
    return items.filter((item) => kinds.includes(item.kind));
  }, [items, filter]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full px-6 py-6">
      <div className="mb-1">
        <h2 className="text-2xl font-bold">{t('notifications.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('notifications.subtitle')}</p>
      </div>

      <div className="flex items-center gap-4 mt-4 mb-4">
        <FilterChips options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-6 px-4">
          <p className="text-sm text-muted-foreground">{t('notifications.error')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('notifications.retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && filteredItems.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
        </div>
      )}

      {!isLoading && !error && filteredItems.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {filteredItems.map((item) => (
            <NotificationRow key={item.id} item={item} onClose={noop} variant="widescreen" />
          ))}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
