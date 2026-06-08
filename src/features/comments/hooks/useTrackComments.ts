import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { getTrackComments } from '../api/getTrackComments';
import { buildCommentThreads } from '../utils/buildCommentThreads';

export function useTrackComments(trackId: number | undefined) {
  const query = useInfiniteQuery({
    queryKey: ['track-comments', trackId],
    queryFn: ({ pageParam = 0 }) => getTrackComments(trackId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: !!trackId,
    gcTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const allComments = useMemo(() => query.data?.pages.flatMap((p) => p.comments) ?? [], [query.data]);

  const threads = useMemo(() => buildCommentThreads(allComments), [allComments]);

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  });

  return {
    threads,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    sentinelRef,
    commentCount: allComments.length,
  };
}
