import type { LibraryPlaylist } from '@/bindings';

export type { LibraryFilter } from '@/lib/filterPlaylists';

export type LibraryActiveTab = 'playlists' | 'tracks';

export type LibraryView = { view: 'list' } | { view: 'detail'; playlist: LibraryPlaylist };
