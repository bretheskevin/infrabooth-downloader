import { useMemo } from 'react';
import { useSearchStore } from '../store';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useDebounce } from '@/hooks';
import type { TrackInfo } from '@/bindings';

const SEARCH_LIMIT = 20;
const DEBOUNCE_MS = 400;


const SOUNDCLOUD_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:soundcloud\.com|on\.soundcloud\.com)\//i;

function isSoundCloudUrl(input: string): boolean {
  return SOUNDCLOUD_URL_PATTERN.test(input);
}

export function useSearchQuery() {
  const inputValue = useSearchStore((s) => s.inputValue);
  const setInputValue = useSearchStore((s) => s.setInputValue);
  const debouncedQuery = useDebounce(inputValue.trim(), DEBOUNCE_MS);

  const isUrlMode = isSoundCloudUrl(debouncedQuery);

  const urlQuery = useQuery({
    queryKey: ['resolve-track-url', debouncedQuery],
    queryFn: () => api.getTrackInfo(debouncedQuery),
    enabled: isUrlMode && debouncedQuery.length > 0,
    gcTime: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const searchQuery = useInfiniteQuery({
    queryKey: ['search-tracks', debouncedQuery],
    queryFn: async ({ pageParam = 0 }) => {
      return api.searchTracks(debouncedQuery, SEARCH_LIMIT, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.collection.length < SEARCH_LIMIT) return undefined;
      return lastPageParam + SEARCH_LIMIT;
    },
    enabled: !isUrlMode && debouncedQuery.length > 0,
    gcTime: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const results: TrackInfo[] = useMemo(() => {
    if (isUrlMode) {
      return urlQuery.data ? [urlQuery.data] : [];
    }
    return searchQuery.data?.pages.flatMap((page) => page.collection) ?? [];
  }, [isUrlMode, urlQuery.data, searchQuery.data]);

  return {
    inputValue,
    handleInputChange: setInputValue,
    results,
    isLoading: isUrlMode ? urlQuery.isLoading : searchQuery.isLoading,
    isFetchingNextPage: isUrlMode ? false : searchQuery.isFetchingNextPage,
    hasNextPage: isUrlMode ? false : (searchQuery.hasNextPage ?? false),
    fetchNextPage: searchQuery.fetchNextPage,
    error: isUrlMode ? urlQuery.error : searchQuery.error,
    hasSearched: debouncedQuery.length > 0,
    isUrlMode,
  };
}
