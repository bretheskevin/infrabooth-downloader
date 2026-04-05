import { create } from 'zustand';
import type { FollowedArtist } from '@/bindings';

export type ActivityFilter = 'all' | 'new' | 'reposted';

interface NewTracksState {
  selectedArtist: FollowedArtist | null;
  activityFilter: ActivityFilter;
  setSelectedArtist: (artist: FollowedArtist, defaultFilter?: ActivityFilter) => void;
  clearSelectedArtist: () => void;
  setActivityFilter: (filter: ActivityFilter) => void;
}

export const useNewTracksStore = create<NewTracksState>((set) => ({
  selectedArtist: null,
  activityFilter: 'all',
  setSelectedArtist: (artist, defaultFilter) => set({ selectedArtist: artist, activityFilter: defaultFilter ?? 'all' }),
  clearSelectedArtist: () => set({ selectedArtist: null, activityFilter: 'all' }),
  setActivityFilter: (filter) => set({ activityFilter: filter }),
}));
