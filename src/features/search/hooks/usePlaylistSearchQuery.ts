import { api } from '@/lib/tauri';
import { useInfiniteSearchQuery } from './useInfiniteSearchQuery';
import { useSearchStore } from '../store';
import type { ArtistPlaylist } from '@/bindings';

export function usePlaylistSearchQuery() {
  const searchType = useSearchStore((s) => s.searchType);
  return useInfiniteSearchQuery<ArtistPlaylist>({
    queryKey: 'search-playlists',
    queryFn: api.searchPlaylists,
    enabled: () => searchType === 'playlists',
  });
}
