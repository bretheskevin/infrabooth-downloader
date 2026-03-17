import { create } from 'zustand';
import type { LibraryFilter } from './types';

interface LibraryState {
  searchQuery: string;
  filter: LibraryFilter;
  setSearchQuery: (value: string) => void;
  setFilter: (filter: LibraryFilter) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  searchQuery: '',
  filter: 'all',
  setSearchQuery: (value) => set({ searchQuery: value }),
  setFilter: (filter) => set({ filter }),
}));
