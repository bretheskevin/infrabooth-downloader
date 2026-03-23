import { create } from 'zustand';
import type { Selection } from '@/bindings';

interface SelectionsState {
  selectedMix: Selection | null;
  setSelectedMix: (mix: Selection) => void;
  clearSelectedMix: () => void;
}

export const useSelectionsStore = create<SelectionsState>((set) => ({
  selectedMix: null,
  setSelectedMix: (selectedMix) => set({ selectedMix }),
  clearSelectedMix: () => set({ selectedMix: null }),
}));
