import { api } from '@/lib/tauri';
import { useInfiniteSearchQuery } from './useInfiniteSearchQuery';
import { useSearchStore } from '../store';
import type { UserSearchResult } from '@/bindings';

export function useArtistSearchQuery() {
  const searchType = useSearchStore((s) => s.searchType);
  return useInfiniteSearchQuery<UserSearchResult>({
    queryKey: 'search-users',
    queryFn: api.searchUsers,
    enabled: () => searchType === 'artists',
  });
}
