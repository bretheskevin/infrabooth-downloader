import { create } from 'zustand';

interface ArtistProfileState {
  profileArtistId: number | null;
  profileArtistName: string | null;
  openProfile: (artistId: number, artistName: string) => void;
  closeProfile: () => void;
}

export const useArtistProfileStore = create<ArtistProfileState>((set) => ({
  profileArtistId: null,
  profileArtistName: null,
  openProfile: (artistId, artistName) => set({ profileArtistId: artistId, profileArtistName: artistName }),
  closeProfile: () => set({ profileArtistId: null, profileArtistName: null }),
}));
