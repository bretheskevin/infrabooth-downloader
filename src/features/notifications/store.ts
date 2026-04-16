import { create } from 'zustand';
import type { PlaylistSummary } from '@/bindings';

interface NotificationsState {
  isPageOpen: boolean;
  selectedPlaylist: PlaylistSummary | null;
  openPage: () => void;
  closePage: () => void;
  openPlaylist: (playlist: PlaylistSummary) => void;
  closePlaylist: () => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  isPageOpen: false,
  selectedPlaylist: null,
  openPage: () => set({ isPageOpen: true }),
  closePage: () => set({ isPageOpen: false }),
  openPlaylist: (playlist) => set({ selectedPlaylist: playlist }),
  closePlaylist: () => set({ selectedPlaylist: null }),
  clear: () => set({ isPageOpen: false, selectedPlaylist: null }),
}));
