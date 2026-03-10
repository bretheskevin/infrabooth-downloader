import type { LibraryPlaylist, LibraryFilter } from '../types';

export function filterPlaylists(
  playlists: LibraryPlaylist[],
  searchQuery: string,
  filter: LibraryFilter,
): LibraryPlaylist[] {
  const query = searchQuery.trim().toLowerCase();

  return playlists.filter((p) => {
    if (filter === 'mine' && !p.is_owned) return false;
    if (filter === 'liked' && p.is_owned) return false;

    if (query) {
      const matchesTitle = p.title.toLowerCase().includes(query);
      const matchesUsername = p.username.toLowerCase().includes(query);
      if (!matchesTitle && !matchesUsername) return false;
    }

    return true;
  });
}
