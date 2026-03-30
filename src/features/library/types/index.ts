import type { LibraryPlaylist } from '@/bindings';

export type LibraryFilter = 'all' | 'mine' | 'liked';

export type LibraryView =
  | { view: 'list' }
  | { view: 'detail'; playlist: LibraryPlaylist };

export const SORT_FIELDS = ['default', 'title', 'artist'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
