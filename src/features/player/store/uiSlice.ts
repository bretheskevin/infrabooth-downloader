import type { StateCreator } from 'zustand';
import { useSettingsStore } from '@/features/settings/store';
import { audioEngine } from '../audio-engine';
import type { UISliceState, PlayerState } from './types';

export interface UISliceActions {
  setVolume: (volume: number) => void;
  toggleExpanded: () => void;
  toggleQueue: () => void;
  collapse: () => void;
}

export type UISlice = UISliceState & UISliceActions;

export const createUISlice: StateCreator<
  PlayerState & UISliceActions,
  [],
  [],
  UISlice
> = (set) => ({
  isExpanded: false,
  isQueueOpen: false,
  volume: 1.0,

  setVolume: (volume) => {
    audioEngine.setVolume(volume);
    set({ volume });
    useSettingsStore.getState().setPlayerVolume(volume);
  },

  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  collapse: () => set({ isExpanded: false }),
});
