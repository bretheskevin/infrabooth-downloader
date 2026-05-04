import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConversationRow } from './ConversationRow';
import { useConversationsPage } from '../hooks/useConversationsPage';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface ConversationsListProps {
  containerClassName?: string;
  onClose: () => void;
}

export function ConversationsList({ containerClassName, onClose }: ConversationsListProps) {
  const { t } = useTranslation();
  const { items, currentUserId, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useConversationsPage();
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
        <p className="text-sm text-muted-foreground">{t('directMessages.error')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t('directMessages.retry')}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">{t('directMessages.empty')}</p>
      </div>
    );
  }

  return (
    <div className={cn('max-h-[400px] overflow-y-auto py-1', containerClassName)}>
      {items.map((conv) => (
        <ConversationRow key={conv.id} conversation={conv} currentUserId={currentUserId} onClose={onClose} />
      ))}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
