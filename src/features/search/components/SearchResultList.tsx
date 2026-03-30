import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { ApiError } from '@/lib/tauri';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { InteractiveTrackRow } from '@/components/InteractiveTrackRow';

interface SearchResultListProps {
  isUrlMode: boolean;
  results: TrackInfo[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  hasSearched: boolean;
}

export function SearchResultList({
  isUrlMode,
  results,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  error,
  hasSearched,
}: SearchResultListProps) {
  const { t } = useTranslation();
  const { sentinelRef } = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // Empty state — no search yet
  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Search className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t('search.emptyState')}</p>
      </div>
    );
  }

  // Loading initial results
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error
  if (error) {
    const isRateLimited = error instanceof ApiError && error.code === 'RATE_LIMITED';
    const errorMessage = isRateLimited
      ? t('search.rateLimited')
      : isUrlMode
        ? t('search.errorResolve')
        : t('search.errorSearch');
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">{errorMessage}</p>
      </div>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t('search.noResults')}</p>
      </div>
    );
  }

  return (
    <div>
      {results.map((track, index) => (
        <InteractiveTrackRow
          key={track.id}
          track={track}
          index={index}
          className="border-b border-border/50 last:border-b-0"
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-8 flex items-center justify-center">
        {isFetchingNextPage && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
