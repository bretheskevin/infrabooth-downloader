import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';
import type { ConversationMessage } from '@/bindings';

export function useConversationMessages(otherUserId: number) {
  const isSignedIn = useIsSignedIn();

  const query = useInfiniteQuery({
    queryKey: ['directMessages', 'messages', otherUserId],
    queryFn: async ({ pageParam }) => api.getConversationMessages(otherUserId, pageParam ?? null),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    enabled: isSignedIn && otherUserId > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const items: ConversationMessage[] = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const currentUserId = query.data?.pages[0]?.current_user_id ?? 0;
  const otherUser = query.data?.pages[0]?.other_user ?? null;

  return {
    items,
    currentUserId,
    otherUser,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
