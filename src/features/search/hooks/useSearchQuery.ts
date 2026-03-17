import { useMemo } from 'react';
import { useSearchStore } from '../store';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useDebounce } from '@/hooks';
import type { TrackInfo } from '@/bindings';

const SEARCH_LIMIT = 20;
const DEBOUNCE_MS = 400;

export function useSearchQuery() {
  const inputValue = useSearchStore((s) => s.inputValue);
  const setInputValue = useSearchStore((s) => s.setInputValue);
  const debouncedQuery = useDebounce(inputValue.trim(), DEBOUNCE_MS);

  const query = useInfiniteQuery({
    queryKey: ['search-tracks', debouncedQuery],
    queryFn: async ({ pageParam = 0 }) => {
      return api.searchTracks(debouncedQuery, SEARCH_LIMIT, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.collection.length < SEARCH_LIMIT) return undefined;
      return lastPageParam + SEARCH_LIMIT;
    },
    enabled: debouncedQuery.length > 0,
    gcTime: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const results: TrackInfo[] = useMemo(
    () => query.data?.pages.flatMap((page) => page.collection) ?? [],
    [query.data],
  );

  return {
    inputValue,
    handleInputChange: setInputValue,
    results,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    hasSearched: debouncedQuery.length > 0,
  };
}
