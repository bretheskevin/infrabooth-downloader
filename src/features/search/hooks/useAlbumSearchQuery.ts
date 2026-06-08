import { api } from '@/lib/tauri';
import { useInfiniteSearchQuery } from './useInfiniteSearchQuery';
import { useSearchStore } from '../store';
import type { ArtistPlaylist } from '@/bindings';

export function useAlbumSearchQuery() {
  const searchType = useSearchStore((s) => s.searchType);
  return useInfiniteSearchQuery<ArtistPlaylist>({
    queryKey: 'search-albums',
    queryFn: api.searchAlbums,
    enabled: () => searchType === 'albums',
  });
}
