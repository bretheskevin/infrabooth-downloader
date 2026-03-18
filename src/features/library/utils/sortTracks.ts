import type { TrackInfo } from '@/bindings';
import type { SortDirection, SortField } from '../types';

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
