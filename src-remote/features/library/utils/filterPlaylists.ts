export type LibraryFilter = 'all' | 'mine' | 'liked';

export interface LibraryPlaylist {
  id: number;
  title: string;
  username: string;
  userId: number | null;
  artworkUrl: string | null;
  trackCount: number;
  duration: number;
  permalinkUrl: string;
  isOwned: boolean;
  isPublic: boolean;
  secretToken: string | null;
}

export function filterPlaylists(playlists: LibraryPlaylist[], searchQuery: string, filter: LibraryFilter): LibraryPlaylist[] {
  const query = searchQuery.trim().toLowerCase();

  return playlists.filter((p) => {
    if (filter === 'mine' && !p.isOwned) return false;
    if (filter === 'liked' && p.isOwned) return false;

    if (query) {
      const matchesTitle = p.title.toLowerCase().includes(query);
      const matchesUsername = p.username.toLowerCase().includes(query);
      if (!matchesTitle && !matchesUsername) return false;
    }

    return true;
  });
}
