import type { LibraryPlaylist } from '@/bindings';

export type { LibraryPlaylist } from '@/bindings';
export type { TrackInfo } from '@/bindings';

export type LibraryFilter = 'all' | 'mine' | 'liked';

export type LibraryView =
  | { view: 'list' }
  | { view: 'detail'; playlist: LibraryPlaylist };

export const SORT_FIELDS = ['default', 'title', 'artist'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
