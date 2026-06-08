import { useTranslation } from 'react-i18next';
import { ArtistSearchResultItem } from './ArtistSearchResultItem';
import { SearchListShell } from './SearchListShell';
import type { SearchQueryState } from '../hooks/useInfiniteSearchQuery';
import type { UserSearchResult } from '@/bindings';

interface ArtistSearchResultListProps {
  query: SearchQueryState<UserSearchResult>;
}

export function ArtistSearchResultList({ query }: ArtistSearchResultListProps) {
  const { t } = useTranslation();

  return (
    <SearchListShell
      hasSearched={query.hasSearched}
      isLoading={query.isLoading}
      error={query.error}
      resultsCount={query.results.length}
      emptyStateMessage={t('search.emptyStateArtists')}
      noResultsMessage={t('search.noArtistResults')}
      fallbackErrorMessage={t('search.errorSearch')}
      hasNextPage={query.hasNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      fetchNextPage={query.fetchNextPage}
    >
      {query.results.map((artist) => (
        <ArtistSearchResultItem key={artist.id} artist={artist} />
      ))}
    </SearchListShell>
  );
}
