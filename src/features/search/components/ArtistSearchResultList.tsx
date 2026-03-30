import { useTranslation } from 'react-i18next';
import { ArtistSearchResultItem } from './ArtistSearchResultItem';
import { SearchListShell } from './SearchListShell';
import type { UserSearchResult } from '@/bindings';

interface ArtistSearchResultListProps {
  results: UserSearchResult[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  hasSearched: boolean;
}

export function ArtistSearchResultList({
  results,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  error,
  hasSearched,
}: ArtistSearchResultListProps) {
  const { t } = useTranslation();

  return (
    <SearchListShell
      hasSearched={hasSearched}
      isLoading={isLoading}
      error={error}
      resultsCount={results.length}
      emptyStateMessage={t('search.emptyStateArtists')}
      noResultsMessage={t('search.noArtistResults')}
      fallbackErrorMessage={t('search.errorSearch')}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    >
      {results.map((artist) => (
        <ArtistSearchResultItem key={artist.id} artist={artist} />
      ))}
    </SearchListShell>
  );
}
