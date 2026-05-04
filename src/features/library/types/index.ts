import type { LibraryPlaylist } from '@/bindings';

export type LibraryFilter = 'all' | 'mine' | 'liked';

export type LibraryActiveTab = 'playlists' | 'tracks';

export type LibraryView = { view: 'list' } | { view: 'detail'; playlist: LibraryPlaylist };
