import { create } from 'zustand';
import type { ArtistPlaylist } from '@/bindings';

interface SelectedPlaylistState {
  selectedPlaylist: ArtistPlaylist | null;
  openPlaylist: (playlist: ArtistPlaylist) => void;
  closePlaylist: () => void;
}

export const useSelectedPlaylistStore = create<SelectedPlaylistState>((set) => ({
  selectedPlaylist: null,
  openPlaylist: (playlist) => set({ selectedPlaylist: playlist }),
  closePlaylist: () => set({ selectedPlaylist: null }),
}));
