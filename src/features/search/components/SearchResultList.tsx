import { useTranslation } from 'react-i18next';
import type { TrackInfo } from '@/bindings';
import { InteractiveTrackRow } from '@/components/InteractiveTrackRow';
import { SearchListShell } from './SearchListShell';

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

  const fallbackErrorMessage = isUrlMode ? t('search.errorResolve') : t('search.errorSearch');

  return (
    <SearchListShell
      hasSearched={hasSearched}
      isLoading={isLoading}
      error={error}
      resultsCount={results.length}
      emptyStateMessage={t('search.emptyState')}
      noResultsMessage={t('search.noResults')}
      fallbackErrorMessage={fallbackErrorMessage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    >
      {results.map((track, index) => (
        <InteractiveTrackRow key={track.id} track={track} index={index} className="border-b border-border/50 last:border-b-0" />
      ))}
    </SearchListShell>
  );
}
