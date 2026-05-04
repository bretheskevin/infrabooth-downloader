import { create } from 'zustand';
import type { FollowedArtist, ReleaseActivityItem } from '@/bindings';
import type { ReleaseFilter } from './constants';

type NewReleasesView =
  | { view: 'carousel' }
  | { view: 'releases'; artist: FollowedArtist; filter: ReleaseFilter }
  | { view: 'tracklist'; artist: FollowedArtist; release: ReleaseActivityItem; filter: ReleaseFilter };

interface NewReleasesState {
  viewState: NewReleasesView;
  setSelectedArtist: (artist: FollowedArtist) => void;
  setReleaseFilter: (filter: ReleaseFilter) => void;
  selectRelease: (release: ReleaseActivityItem) => void;
  goBackToReleases: () => void;
  goBackToCarousel: () => void;
}

export const useNewReleasesStore = create<NewReleasesState>((set, get) => ({
  viewState: { view: 'carousel' },

  setSelectedArtist: (artist) => set({ viewState: { view: 'releases', artist, filter: 'all' } }),

  setReleaseFilter: (filter) => {
    const current = get().viewState;
    if (current.view === 'releases') {
      set({ viewState: { ...current, filter } });
    }
  },

  selectRelease: (release) => {
    const current = get().viewState;
    if (current.view === 'releases') {
      set({ viewState: { view: 'tracklist', artist: current.artist, release, filter: current.filter } });
    }
  },

  goBackToReleases: () => {
    const current = get().viewState;
    if (current.view === 'tracklist') {
      set({ viewState: { view: 'releases', artist: current.artist, filter: current.filter } });
    }
  },

  goBackToCarousel: () => set({ viewState: { view: 'carousel' } }),
}));
