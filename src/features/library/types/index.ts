import type { LibraryPlaylist } from '@/bindings';

export type { LibraryPlaylist } from '@/bindings';
export type { TrackInfo } from '@/bindings';

export type LibraryFilter = 'all' | 'mine' | 'liked';

export type LibraryView =
  | { view: 'list' }
  | { view: 'detail'; playlist: LibraryPlaylist };
