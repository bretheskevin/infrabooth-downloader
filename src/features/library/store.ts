import { create } from 'zustand';
import type { LibraryFilter, LibraryView } from './types';

interface LibraryState {
  searchQuery: string;
  filter: LibraryFilter;
  libraryView: LibraryView;
  listScrollTop: number;
  detailScrollTop: number;
  setSearchQuery: (value: string) => void;
  setFilter: (filter: LibraryFilter) => void;
  setLibraryView: (view: LibraryView) => void;
  setListScrollTop: (value: number) => void;
  setDetailScrollTop: (value: number) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  searchQuery: '',
  filter: 'all',
  libraryView: { view: 'list' },
  listScrollTop: 0,
  detailScrollTop: 0,
  setSearchQuery: (value) => set({ searchQuery: value }),
  setFilter: (filter) => set({ filter }),
  setLibraryView: (libraryView) => set({ libraryView }),
  setListScrollTop: (listScrollTop) => set({ listScrollTop }),
  setDetailScrollTop: (detailScrollTop) => set({ detailScrollTop }),
}));
