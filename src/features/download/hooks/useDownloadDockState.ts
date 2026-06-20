import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQueueStore } from '@/features/queue';
import { useDockUiStore, useIsDockVisible } from '../store';

export type DockStatus = 'idle' | 'initializing' | 'processing' | 'complete' | 'cancelled';

export interface DownloadDockState {
  isVisible: boolean;
  status: DockStatus;
  totalTracks: number;
  doneCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  percentage: number;
  isCancelling: boolean;
  isDashboardOpen: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;
  dismissDock: () => void;
}

const dockActions = () => useDockUiStore.getState();

export function useDownloadDockState(): DownloadDockState {
  const {
    isProcessing,
    isInitializing,
    isComplete,
    isCancelled,
    isCancelling,
    tracks,
    totalTracks,
    completedCount,
    failedCount,
    cancelledCount,
  } = useQueueStore(
    useShallow((s) => ({
      isProcessing: s.isProcessing,
      isInitializing: s.isInitializing,
      isComplete: s.isComplete,
      isCancelled: s.isCancelled,
      isCancelling: s.isCancelling,
      tracks: s.tracks,
      totalTracks: s.totalTracks,
      completedCount: s.completedCount,
      failedCount: s.failedCount,
      cancelledCount: s.cancelledCount,
    })),
  );

  const isDashboardOpen = useDockUiStore((s) => s.isDashboardOpen);
  const isVisible = useIsDockVisible();

  const status: DockStatus = isInitializing
    ? 'initializing'
    : isProcessing
      ? 'processing'
      : isComplete
        ? isCancelled
          ? 'cancelled'
          : 'complete'
        : 'idle';

  const doneCount = tracks.reduce((count, track) => (track.status === 'complete' || track.status === 'skipped' ? count + 1 : count), 0);
  const percentage = totalTracks > 0 ? Math.floor((doneCount / totalTracks) * 100) : 0;

  const openDashboard = useCallback(() => dockActions().setDashboardOpen(true), []);
  const closeDashboard = useCallback(() => dockActions().setDashboardOpen(false), []);
  const dismissDock = useCallback(() => {
    dockActions().setDismissed(true);
    dockActions().setDashboardOpen(false);
  }, []);

  return {
    isVisible,
    status,
    totalTracks,
    doneCount,
    completedCount,
    failedCount,
    cancelledCount,
    percentage,
    isCancelling,
    isDashboardOpen,
    openDashboard,
    closeDashboard,
    dismissDock,
  };
}
