import { create } from 'zustand';
import type { LibraryActiveTab, LibraryFilter, LibraryView } from './types';

interface LibraryState {
  activeTab: LibraryActiveTab;
  searchQuery: string;
  filter: LibraryFilter;
  libraryView: LibraryView;
  listScrollTop: number;
  detailScrollTop: number;
  tracksSearchQuery: string;
  tracksScrollTop: number;
  setActiveTab: (tab: LibraryActiveTab) => void;
  setSearchQuery: (value: string) => void;
  setFilter: (filter: LibraryFilter) => void;
  setLibraryView: (view: LibraryView) => void;
  setListScrollTop: (value: number) => void;
  setDetailScrollTop: (value: number) => void;
  setTracksSearchQuery: (value: string) => void;
  setTracksScrollTop: (value: number) => void;
}

export const libraryActions = () => useLibraryStore.getState();

export const useLibraryStore = create<LibraryState>((set) => ({
  activeTab: 'playlists',
  searchQuery: '',
  filter: 'all',
  libraryView: { view: 'list' },
  listScrollTop: 0,
  detailScrollTop: 0,
  tracksSearchQuery: '',
  tracksScrollTop: 0,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (value) => set({ searchQuery: value }),
  setFilter: (filter) => set({ filter }),
  setLibraryView: (libraryView) => set({ libraryView }),
  setListScrollTop: (listScrollTop) => set({ listScrollTop }),
  setDetailScrollTop: (detailScrollTop) => set({ detailScrollTop }),
  setTracksSearchQuery: (value) => set({ tracksSearchQuery: value }),
  setTracksScrollTop: (tracksScrollTop) => set({ tracksScrollTop }),
}));
