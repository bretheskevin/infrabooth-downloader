import { create } from 'zustand';
import type { FollowedArtist } from '@/bindings';
import type { ActivityFilter } from './constants';

interface NewTracksState {
  selectedArtist: FollowedArtist | null;
  activityFilter: ActivityFilter;
  setSelectedArtist: (artist: FollowedArtist) => void;
  clearSelectedArtist: () => void;
  setActivityFilter: (filter: ActivityFilter) => void;
}

export const useNewTracksStore = create<NewTracksState>((set) => ({
  selectedArtist: null,
  activityFilter: 'all',
  setSelectedArtist: (artist) => set({ selectedArtist: artist, activityFilter: 'all' }),
  clearSelectedArtist: () => set({ selectedArtist: null, activityFilter: 'all' }),
  setActivityFilter: (filter) => set({ activityFilter: filter }),
}));
