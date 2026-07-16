import { describe, it, expect, vi } from 'vitest';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  insertOptimisticMessage,
  invalidateConversation,
  messagesQueryKey,
  normalizeContent,
  rollbackOptimisticMessage,
} from '../utils/optimisticMessages';
import type { MessagesPage, MessageUser } from '@/bindings';

const OTHER_USER_ID = 42;

const otherUser: MessageUser = {
  id: OTHER_USER_ID,
  username: 'other',
  avatar_url: null,
  permalink_url: 'https://soundcloud.com/other',
};

function makePage(contents: string[], currentUserId = 7): MessagesPage {
  return {
    items: contents.map((content) => ({ content, sender_id: OTHER_USER_ID, sent_at: '2026-01-01T00:00:00Z', track_embed: null })),
    other_user: otherUser,
    current_user_id: currentUserId,
    next_offset: null,
  };
}

function seedCache(queryClient: QueryClient, pages: MessagesPage[]): InfiniteData<MessagesPage> {
  const data: InfiniteData<MessagesPage> = { pages, pageParams: pages.map((_, i) => i) };
  queryClient.setQueryData(messagesQueryKey(OTHER_USER_ID), data);
  return data;
}

describe('normalizeContent', () => {
  it('prefixes on.soundcloud.com short links with https://', () => {
    expect(normalizeContent('listen: on.soundcloud.com/abc123')).toBe('listen: https://on.soundcloud.com/abc123');
  });

  it('leaves short links already preceded by a protocol untouched', () => {
    expect(normalizeContent('https://on.soundcloud.com/abc123')).toBe('https://on.soundcloud.com/abc123');
  });

  it('leaves content without short links untouched', () => {
    expect(normalizeContent('hello https://soundcloud.com/artist/track')).toBe('hello https://soundcloud.com/artist/track');
  });
});

describe('insertOptimisticMessage', () => {
  it('prepends the message to the first page and returns the snapshot', async () => {
    const queryClient = new QueryClient();
    const seeded = seedCache(queryClient, [makePage(['older']), makePage(['oldest'])]);

    const snapshot = await insertOptimisticMessage(queryClient, OTHER_USER_ID, 'hello');

    expect(snapshot).toEqual(seeded);
    const data = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesQueryKey(OTHER_USER_ID));
    expect(data?.pages[0]?.items.map((m) => m.content)).toEqual(['hello', 'older']);
    expect(data?.pages[1]?.items.map((m) => m.content)).toEqual(['oldest']);
  });

  it('uses current_user_id from the cache as sender', async () => {
    const queryClient = new QueryClient();
    seedCache(queryClient, [makePage(['older'], 7)]);

    await insertOptimisticMessage(queryClient, OTHER_USER_ID, 'hello', 99);

    const data = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesQueryKey(OTHER_USER_ID));
    expect(data?.pages[0]?.items[0]?.sender_id).toBe(7);
  });

  it('returns undefined and leaves the cache empty when no conversation is cached', async () => {
    const queryClient = new QueryClient();

    const snapshot = await insertOptimisticMessage(queryClient, OTHER_USER_ID, 'hello');

    expect(snapshot).toBeUndefined();
    expect(queryClient.getQueryData(messagesQueryKey(OTHER_USER_ID))).toBeUndefined();
  });
});

describe('rollbackOptimisticMessage', () => {
  it('restores the snapshot', async () => {
    const queryClient = new QueryClient();
    const seeded = seedCache(queryClient, [makePage(['older'])]);
    await insertOptimisticMessage(queryClient, OTHER_USER_ID, 'hello');

    rollbackOptimisticMessage(queryClient, OTHER_USER_ID, seeded);

    expect(queryClient.getQueryData(messagesQueryKey(OTHER_USER_ID))).toEqual(seeded);
  });

  it('invalidates the conversation when there is no snapshot', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    rollbackOptimisticMessage(queryClient, OTHER_USER_ID, undefined);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: messagesQueryKey(OTHER_USER_ID) });
  });
});

describe('invalidateConversation', () => {
  it('invalidates the messages and conversations queries', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateConversation(queryClient, OTHER_USER_ID);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: messagesQueryKey(OTHER_USER_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['directMessages', 'conversations'] });
  });
});
