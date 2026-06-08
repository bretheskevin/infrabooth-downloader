import { useTranslation } from 'react-i18next';
import { SearchListShell } from './SearchListShell';
import { PlaylistSearchResultItem } from './PlaylistSearchResultItem';
import type { SearchQueryState } from '../hooks/useInfiniteSearchQuery';
import type { ArtistPlaylist } from '@/bindings';

interface PlaylistSearchResultListProps {
  query: SearchQueryState<ArtistPlaylist>;
  emptyStateMessage?: string;
  noResultsMessage?: string;
}

export function PlaylistSearchResultList({ query, emptyStateMessage, noResultsMessage }: PlaylistSearchResultListProps) {
  const { t } = useTranslation();

  return (
    <SearchListShell
      hasSearched={query.hasSearched}
      isLoading={query.isLoading}
      error={query.error}
      resultsCount={query.results.length}
      emptyStateMessage={emptyStateMessage ?? t('search.emptyStatePlaylists')}
      noResultsMessage={noResultsMessage ?? t('search.noPlaylistResults')}
      fallbackErrorMessage={t('search.errorSearch')}
      hasNextPage={query.hasNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      fetchNextPage={query.fetchNextPage}
    >
      {query.results.map((playlist) => (
        <PlaylistSearchResultItem key={playlist.id} playlist={playlist} />
      ))}
    </SearchListShell>
  );
}
