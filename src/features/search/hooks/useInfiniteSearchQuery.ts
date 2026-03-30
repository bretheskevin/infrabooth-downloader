import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks';
import { useSearchStore } from '../store';

const DEBOUNCE_MS = 400;
const SEARCH_LIMIT = 20;

export function useInfiniteSearchQuery<T>({
  queryKey,
  queryFn,
  enabled,
}: {
  queryKey: string;
  queryFn: (query: string, limit: number, offset: number) => Promise<{ collection: T[] }>;
  enabled?: (debouncedQuery: string) => boolean;
}) {
  const inputValue = useSearchStore((s) => s.inputValue);
  const debouncedQuery = useDebounce(inputValue.trim(), DEBOUNCE_MS);

  const isEnabled = (enabled?.(debouncedQuery) ?? true) && debouncedQuery.length > 0;

  const searchQuery = useInfiniteQuery({
    queryKey: [queryKey, debouncedQuery],
    queryFn: async ({ pageParam = 0 }) => queryFn(debouncedQuery, SEARCH_LIMIT, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.collection.length < SEARCH_LIMIT) return undefined;
      return lastPageParam + SEARCH_LIMIT;
    },
    enabled: isEnabled,
    gcTime: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const results: T[] = useMemo(() => {
    return searchQuery.data?.pages.flatMap((page) => page.collection) ?? [];
  }, [searchQuery.data]);

  return {
    debouncedQuery,
    results,
    isLoading: searchQuery.isLoading,
    isFetchingNextPage: searchQuery.isFetchingNextPage,
    hasNextPage: searchQuery.hasNextPage ?? false,
    fetchNextPage: searchQuery.fetchNextPage,
    error: searchQuery.error,
    hasSearched: debouncedQuery.length > 0,
  };
}

export { DEBOUNCE_MS, SEARCH_LIMIT };
