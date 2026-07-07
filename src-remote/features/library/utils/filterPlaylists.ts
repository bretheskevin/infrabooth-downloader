import { filterPlaylists as filterPlaylistsBy, type LibraryFilter } from '@/lib/filterPlaylists';

export type { LibraryFilter };

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
  return filterPlaylistsBy(playlists, searchQuery, filter, (p) => p.isOwned);
}
