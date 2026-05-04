import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';
import type { ConversationSummary } from '@/bindings';

export function useConversationsPage() {
  const isSignedIn = useIsSignedIn();

  const query = useInfiniteQuery({
    queryKey: ['directMessages', 'conversations'],
    queryFn: async ({ pageParam }) => api.getConversationsPage(pageParam ?? null),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const items: ConversationSummary[] = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const currentUserId = query.data?.pages[0]?.current_user_id ?? 0;

  return {
    items,
    currentUserId,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
