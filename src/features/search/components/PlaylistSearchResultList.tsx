import { useTranslation } from 'react-i18next';
import { SearchListShell } from './SearchListShell';
import { PlaylistSearchResultItem } from './PlaylistSearchResultItem';
import type { ArtistPlaylist } from '@/bindings';

interface PlaylistSearchResultListProps {
  results: ArtistPlaylist[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  hasSearched: boolean;
  emptyStateMessage?: string;
  noResultsMessage?: string;
}

export function PlaylistSearchResultList({
  results,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  error,
  hasSearched,
  emptyStateMessage,
  noResultsMessage,
}: PlaylistSearchResultListProps) {
  const { t } = useTranslation();

  return (
    <SearchListShell
      hasSearched={hasSearched}
      isLoading={isLoading}
      error={error}
      resultsCount={results.length}
      emptyStateMessage={emptyStateMessage ?? t('search.emptyStatePlaylists')}
      noResultsMessage={noResultsMessage ?? t('search.noPlaylistResults')}
      fallbackErrorMessage={t('search.errorSearch')}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
    >
      {results.map((playlist) => (
        <PlaylistSearchResultItem key={playlist.id} playlist={playlist} />
      ))}
    </SearchListShell>
  );
}
