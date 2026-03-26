import { create } from 'zustand';
import type { FollowedArtist } from '@/bindings';

interface NewTracksState {
  selectedArtist: FollowedArtist | null;
  setSelectedArtist: (artist: FollowedArtist) => void;
  clearSelectedArtist: () => void;
}

export const useNewTracksStore = create<NewTracksState>((set) => ({
  selectedArtist: null,
  setSelectedArtist: (artist) => set({ selectedArtist: artist }),
  clearSelectedArtist: () => set({ selectedArtist: null }),
}));
