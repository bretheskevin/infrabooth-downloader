import type { StateCreator } from 'zustand';
import { useSettingsStore } from '@/features/settings/store';
import { audioEngine } from '../audio-engine';
import type { UISliceState, PlayerState } from './types';

export interface UISliceActions {
  setVolume: (volume: number) => void;
  toggleExpanded: () => void;
  toggleQueue: () => void;
  toggleComments: () => void;
  setRailTab: (tab: 'queue' | 'comments') => void;
  collapse: () => void;
}

export type UISlice = UISliceState & UISliceActions;

export const createUISlice: StateCreator<PlayerState & UISliceActions, [], [], UISlice> = (set) => ({
  isExpanded: false,
  isQueueOpen: false,
  isCommentsOpen: false,
  railTab: 'queue' as const,
  volume: 1.0,

  setVolume: (volume) => {
    audioEngine.setVolume(volume);
    set({ volume });
    useSettingsStore.getState().setPlayerVolume(volume);
  },

  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen, isCommentsOpen: false })),
  toggleComments: () => set((s) => ({ isCommentsOpen: !s.isCommentsOpen, isQueueOpen: false })),
  setRailTab: (tab) => set({ railTab: tab }),
  collapse: () => set({ isExpanded: false }),
});
