import type { LibraryPlaylist } from '@/bindings';

export type { LibraryPlaylist } from '@/bindings';
export type { TrackInfo } from '@/bindings';

export type LibraryFilter = 'all' | 'mine' | 'liked';

export type LibraryView =
  | { view: 'list' }
  | { view: 'detail'; playlist: LibraryPlaylist };

export const SORT_MODES = ['default', 'title-asc', 'title-desc', 'artist-asc', 'artist-desc'] as const;
export type SortMode = (typeof SORT_MODES)[number];
