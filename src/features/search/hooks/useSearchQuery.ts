import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/tauri';
import { useInfiniteSearchQuery } from './useInfiniteSearchQuery';
import { useSearchStore } from '../store';
import type { TrackInfo } from '@/bindings';

const SOUNDCLOUD_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:soundcloud\.com|on\.soundcloud\.com)\//i;

function isSoundCloudUrl(input: string): boolean {
  return SOUNDCLOUD_URL_PATTERN.test(input);
}

export function useSearchQuery() {
  const searchType = useSearchStore((s) => s.searchType);
  const search = useInfiniteSearchQuery<TrackInfo>({
    queryKey: 'search-tracks',
    queryFn: api.searchTracks,
    enabled: (q) => searchType === 'tracks' && !isSoundCloudUrl(q),
  });

  const { debouncedQuery } = search;
  const isUrlMode = isSoundCloudUrl(debouncedQuery);

  const urlQuery = useQuery({
    queryKey: ['resolve-track-url', debouncedQuery],
    queryFn: () => api.getTrackInfo(debouncedQuery),
    enabled: searchType === 'tracks' && isUrlMode && debouncedQuery.length > 0,
    gcTime: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const results: TrackInfo[] = useMemo(() => {
    if (isUrlMode) return urlQuery.data ? [urlQuery.data] : [];
    return search.results;
  }, [isUrlMode, urlQuery.data, search.results]);

  return {
    results,
    isLoading: isUrlMode ? urlQuery.isLoading : search.isLoading,
    isFetchingNextPage: isUrlMode ? false : search.isFetchingNextPage,
    hasNextPage: isUrlMode ? false : search.hasNextPage,
    fetchNextPage: search.fetchNextPage,
    error: isUrlMode ? urlQuery.error : search.error,
    hasSearched: debouncedQuery.length > 0,
    isUrlMode,
  };
}
