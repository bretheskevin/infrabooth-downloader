import { Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { ApiError } from '@/lib/tauri';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';

interface SearchListShellProps {
  hasSearched: boolean;
  isLoading: boolean;
  error: Error | null;
  resultsCount: number;
  emptyStateMessage: string;
  noResultsMessage: string;
  fallbackErrorMessage: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  children: React.ReactNode;
}

export function SearchListShell({
  hasSearched,
  isLoading,
  error,
  resultsCount,
  emptyStateMessage,
  noResultsMessage,
  fallbackErrorMessage,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  children,
}: SearchListShellProps) {
  const { t } = useTranslation();
  const isWidescreen = useIsWidescreen();
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Search className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    const isRateLimited = error instanceof ApiError && error.code === 'RATE_LIMITED';
    const errorMessage = isRateLimited ? t('search.rateLimited') : fallbackErrorMessage;
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">{errorMessage}</p>
      </div>
    );
  }

  if (resultsCount === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{noResultsMessage}</p>
      </div>
    );
  }

  return (
    <div className={isWidescreen ? 'grid grid-cols-[repeat(auto-fill,minmax(440px,1fr))] gap-x-4' : undefined}>
      {children}
      <div ref={sentinelRef} className="h-8 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
