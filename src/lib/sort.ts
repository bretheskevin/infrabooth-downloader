import type { TrackInfo } from '@/bindings';

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export type SortField = 'default' | 'title' | 'artist';

export const TRACK_SORT_OPTIONS = [
  { key: 'default', label: 'common.sortDefault' },
  { key: 'title', label: 'common.sortTitle' },
  { key: 'artist', label: 'common.sortArtist' },
] as const satisfies readonly { key: SortField; label: string }[];

export function sortTracks(tracks: TrackInfo[], field: SortField, direction: SortDirection): TrackInfo[] {
  if (field === 'default') {
    return direction === 'asc' ? tracks : [...tracks].reverse();
  }

  const dir = direction === 'asc' ? 1 : -1;
  return [...tracks].sort((a, b) => {
    const aVal = field === 'title' ? a.title : a.user.username;
    const bVal = field === 'title' ? b.title : b.user.username;
    return dir * aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
  });
}
