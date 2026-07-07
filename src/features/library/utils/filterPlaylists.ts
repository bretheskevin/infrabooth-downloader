import type { LibraryPlaylist } from '@/bindings';
import type { LibraryFilter } from '../types';
import { filterPlaylists as filterPlaylistsBy } from '@/lib/filterPlaylists';

export function filterPlaylists(playlists: LibraryPlaylist[], searchQuery: string, filter: LibraryFilter): LibraryPlaylist[] {
  return filterPlaylistsBy(playlists, searchQuery, filter, (p) => p.is_owned);
}
