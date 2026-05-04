import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useIsSignedIn } from '@/features/auth/store';
import type { NotificationItem } from '@/bindings';

export function useNotificationsPage(enabled = true) {
  const isSignedIn = useIsSignedIn();

  const query = useInfiniteQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: async ({ pageParam }) => api.getNotificationsPage(pageParam ?? null),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: isSignedIn && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const items: NotificationItem[] = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
