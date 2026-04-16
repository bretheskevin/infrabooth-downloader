import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageRow } from './MessageRow';
import { useConversationMessages } from '../hooks/useConversationMessages';
import { useMessagesStore } from '../store';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useIsMiniPillVisible } from '@/features/player/hooks/useIsMiniPillVisible';

export function ConversationPage() {
  const { t } = useTranslation();
  const conversation = useMessagesStore((s) => s.selectedConversation);

  const { items, currentUserId, otherUser, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useConversationMessages(conversation?.otherUserId ?? 0);
  const { sentinelRef } = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });
  const miniPillVisible = useIsMiniPillVisible();

  const displayUser = otherUser?.username ? otherUser : conversation
    ? { id: conversation.otherUserId, username: conversation.username, avatar_url: conversation.avatarUrl, permalink_url: '' }
    : null;

  const handleClose = () => useMessagesStore.getState().clear();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={handleClose} aria-label={t('common.back')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {displayUser && (
          <>
            <Avatar className="h-9 w-9">
              <AvatarImage src={displayUser.avatar_url ?? undefined} alt={displayUser.username} />
              <AvatarFallback className="text-sm">{displayUser.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{displayUser.username}</h2>
          </>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8 flex-1">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-6 px-4">
          <p className="text-sm text-muted-foreground">{t('directMessages.error')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('directMessages.retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <div className={cn('flex-1 min-h-0 overflow-y-auto flex flex-col-reverse gap-5 pb-4 px-4', miniPillVisible && 'pb-14')}>
          {items.map((msg, idx) => (
            <MessageRow
              key={`${msg.sent_at}-${idx}`}
              message={msg}
              currentUserId={currentUserId}
              otherUser={displayUser}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
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
