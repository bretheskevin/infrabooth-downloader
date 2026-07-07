export type LibraryFilter = 'all' | 'mine' | 'liked';

interface FilterablePlaylist {
  title: string;
  username: string;
}

export function filterPlaylists<T extends FilterablePlaylist>(
  playlists: T[],
  searchQuery: string,
  filter: LibraryFilter,
  isOwned: (playlist: T) => boolean,
): T[] {
  const query = searchQuery.trim().toLowerCase();

  return playlists.filter((p) => {
    if (filter === 'mine' && !isOwned(p)) return false;
    if (filter === 'liked' && isOwned(p)) return false;

    if (query) {
      const matchesTitle = p.title.toLowerCase().includes(query);
      const matchesUsername = p.username.toLowerCase().includes(query);
      if (!matchesTitle && !matchesUsername) return false;
    }

    return true;
  });
}
