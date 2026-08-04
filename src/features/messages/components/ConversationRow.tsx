import { useTranslation } from 'react-i18next';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ConversationsPage, ConversationSummary } from '@/bindings';
import { useArtistProfileStore } from '@/features/artist-profile/store';
import { useMessagesStore } from '../store';
import { formatChatTimestamp } from '@/lib/date';
import { cn } from '@/lib/utils';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';

interface ConversationRowProps {
  conversation: ConversationSummary;
  currentUserId: number;
  onClose: () => void;
}

function markConversationReadInCache(queryClient: ReturnType<typeof useQueryClient>, conversationId: string) {
  queryClient.setQueryData<InfiniteData<ConversationsPage>>(['directMessages', 'conversations'], (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((conv) => (conv.id === conversationId ? { ...conv, read: true } : conv)),
      })),
    };
  });

  const data = queryClient.getQueryData<InfiniteData<ConversationsPage>>(['directMessages', 'conversations']);
  const hasOtherUnread = data?.pages.some((page) => page.items.some((conv) => conv.id !== conversationId && !conv.read));
  if (!hasOtherUnread) {
    queryClient.setQueryData(['directMessages', 'unread'], false);
  }
}

export function ConversationRow({ conversation, currentUserId, onClose }: ConversationRowProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { other_user, last_message_content, last_message_sender_id, last_message_at, read } = conversation;

  const isOwnMessage = last_message_sender_id === currentUserId;
  const preview = isOwnMessage ? `${t('directMessages.you')} : ${last_message_content}` : last_message_content;
  const displayName = other_user.username || t('directMessages.deletedUser');

  const handleClick = () => {
    if (!read) {
      markConversationReadInCache(queryClient, conversation.id);
      void api.markConversationRead(other_user.id).catch((err: unknown) => {
        void logger.warn(`Failed to mark conversation as read: ${err}`);
      });
    }

    useArtistProfileStore.getState().closeProfile();
    useMessagesStore.getState().openConversation({
      otherUserId: other_user.id,
      username: other_user.username,
      avatarUrl: other_user.avatar_url,
      permalinkUrl: other_user.permalink_url,
    });
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className={cn('w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50', !read && 'bg-accent/30')}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={other_user.avatar_url ?? undefined} alt={displayName} />
        <AvatarFallback className="text-xs">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('text-sm truncate', !read ? 'font-semibold' : 'font-medium text-muted-foreground')}>{displayName}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">{formatChatTimestamp(last_message_at, i18n.language)}</span>
        </div>
        <p className={cn('text-xs truncate mt-0.5', !read ? 'text-foreground/80 font-medium' : 'text-muted-foreground')}>{preview}</p>
      </div>
      {!read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 self-center" />}
    </button>
  );
}
