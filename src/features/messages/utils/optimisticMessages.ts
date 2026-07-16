import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { normalizeShortUrl } from '@/lib/soundcloud';
import type { ConversationMessage, MessagesPage } from '@/bindings';

const SC_SHORT_URL_PATTERN = /(?<!\/\/)on\.soundcloud\.com\/\S+/g;

export function normalizeContent(content: string): string {
  return content.replace(SC_SHORT_URL_PATTERN, (match) => normalizeShortUrl(match));
}

export function messagesQueryKey(otherUserId: number) {
  return ['directMessages', 'messages', otherUserId];
}

export async function insertOptimisticMessage(
  queryClient: QueryClient,
  otherUserId: number,
  content: string,
  fallbackSenderId = 0,
): Promise<InfiniteData<MessagesPage> | undefined> {
  const messagesKey = messagesQueryKey(otherUserId);
  await queryClient.cancelQueries({ queryKey: messagesKey });

  const snapshot = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);

  const optimisticMessage: ConversationMessage = {
    content,
    sender_id: snapshot?.pages[0]?.current_user_id ?? fallbackSenderId,
    sent_at: new Date().toISOString(),
    track_embed: null,
  };

  queryClient.setQueryData<InfiniteData<MessagesPage>>(messagesKey, (old) => {
    if (!old || old.pages.length === 0) return old;
    const firstPage = old.pages[0]!;
    return {
      ...old,
      pages: [{ ...firstPage, items: [optimisticMessage, ...firstPage.items] }, ...old.pages.slice(1)],
    };
  });

  return snapshot;
}

export function rollbackOptimisticMessage(
  queryClient: QueryClient,
  otherUserId: number,
  snapshot: InfiniteData<MessagesPage> | undefined,
): void {
  const messagesKey = messagesQueryKey(otherUserId);
  if (snapshot) {
    queryClient.setQueryData(messagesKey, snapshot);
  } else {
    void queryClient.invalidateQueries({ queryKey: messagesKey });
  }
}

export function invalidateConversation(queryClient: QueryClient, otherUserId: number): void {
  void queryClient.invalidateQueries({ queryKey: messagesQueryKey(otherUserId) });
  void queryClient.invalidateQueries({ queryKey: ['directMessages', 'conversations'] });
}
