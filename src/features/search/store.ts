import { create } from 'zustand';

export type SearchType = 'tracks' | 'artists' | 'playlists';

interface SearchState {
  inputValue: string;
  setInputValue: (value: string) => void;
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value }),
  searchType: 'tracks',
  setSearchType: (searchType) => set({ searchType }),
}));
