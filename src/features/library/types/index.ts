import type { LibraryPlaylist } from '@/bindings';

export type LibraryFilter = 'all' | 'mine' | 'liked';

export type LibraryView =
  | { view: 'list' }
  | { view: 'detail'; playlist: LibraryPlaylist };

export type SortField = 'default' | 'title' | 'artist';
