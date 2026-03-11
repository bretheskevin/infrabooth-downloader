import type { TrackInfo } from '@/bindings';
import type { SortMode } from '../types';

export function sortTracks(tracks: TrackInfo[], mode: SortMode): TrackInfo[] {
  if (mode === 'default') return tracks;

  return [...tracks].sort((a, b) => {
    switch (mode) {
      case 'title-asc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'title-desc':
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      case 'artist-asc':
        return a.user.username.localeCompare(b.user.username, undefined, { sensitivity: 'base' });
      case 'artist-desc':
        return b.user.username.localeCompare(a.user.username, undefined, { sensitivity: 'base' });
    }
  });
}
