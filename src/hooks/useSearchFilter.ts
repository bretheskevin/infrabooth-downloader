import { useState, useMemo } from 'react';
import { filterTracks } from '@/lib/filterTracks';
import type { TrackInfo } from '@/bindings';

export function useSearchFilter(tracks: TrackInfo[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTracks = useMemo(() => filterTracks(tracks, searchQuery), [tracks, searchQuery]);

  return { searchQuery, setSearchQuery, filteredTracks };
}
