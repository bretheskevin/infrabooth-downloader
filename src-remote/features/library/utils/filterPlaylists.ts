import { filterPlaylists as filterPlaylistsBy, type LibraryFilter } from '@/lib/filterPlaylists';
import type { LibraryPlaylist } from '@remote/lib/playlistMapping';

export type { LibraryFilter, LibraryPlaylist };

export function filterPlaylists(playlists: LibraryPlaylist[], searchQuery: string, filter: LibraryFilter): LibraryPlaylist[] {
  return filterPlaylistsBy(playlists, searchQuery, filter, (p) => p.isOwned);
}
