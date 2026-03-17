import { create } from 'zustand';

interface SearchState {
  inputValue: string;
  setInputValue: (value: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value }),
}));
