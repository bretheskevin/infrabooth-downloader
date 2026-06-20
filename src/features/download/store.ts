import { create } from 'zustand';
import { useQueueStore } from '@/features/queue';

interface DockUiState {
  isDismissed: boolean;
  isDashboardOpen: boolean;
  setDismissed: (dismissed: boolean) => void;
  setDashboardOpen: (open: boolean) => void;
}

export const useDockUiStore = create<DockUiState>((set) => ({
  isDismissed: false,
  isDashboardOpen: false,
  setDismissed: (isDismissed) => set({ isDismissed }),
  setDashboardOpen: (isDashboardOpen) => set({ isDashboardOpen }),
}));

useQueueStore.subscribe((state, prevState) => {
  if (state.isProcessing && !prevState.isProcessing) {
    useDockUiStore.getState().setDismissed(false);
  }
});

export function useIsDockVisible(): boolean {
  const isDismissed = useDockUiStore((s) => s.isDismissed);
  const isActive = useQueueStore((s) => s.isInitializing || s.isProcessing || s.isComplete);
  return isActive && !isDismissed;
}
