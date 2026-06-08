import { useTranslation } from 'react-i18next';
import type { TrackInfo } from '@/bindings';
import { InteractiveTrackRow } from '@/components/InteractiveTrackRow';
import { SearchListShell } from './SearchListShell';
import type { SearchQueryState } from '../hooks/useInfiniteSearchQuery';

interface SearchResultListProps {
  query: SearchQueryState<TrackInfo>;
  isUrlMode: boolean;
}

export function SearchResultList({ query, isUrlMode }: SearchResultListProps) {
  const { t } = useTranslation();

  const fallbackErrorMessage = isUrlMode ? t('search.errorResolve') : t('search.errorSearch');

  return (
    <SearchListShell
      hasSearched={query.hasSearched}
      isLoading={query.isLoading}
      error={query.error}
      resultsCount={query.results.length}
      emptyStateMessage={t('search.emptyState')}
      noResultsMessage={t('search.noResults')}
      fallbackErrorMessage={fallbackErrorMessage}
      hasNextPage={query.hasNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      fetchNextPage={query.fetchNextPage}
    >
      {query.results.map((track, index) => (
        <InteractiveTrackRow key={track.id} track={track} index={index} className="border-b border-border/50 last:border-b-0" />
      ))}
    </SearchListShell>
  );
}
