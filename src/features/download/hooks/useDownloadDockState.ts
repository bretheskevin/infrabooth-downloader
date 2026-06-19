import { useState, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQueueStore } from '@/features/queue';

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

  const [isDismissed, setIsDismissed] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const prevProcessingRef = useRef(false);
  if (isProcessing && !prevProcessingRef.current && isDismissed) {
    setIsDismissed(false);
  }
  prevProcessingRef.current = isProcessing;

  const status: DockStatus = isInitializing
    ? 'initializing'
    : isProcessing
      ? 'processing'
      : isComplete
        ? isCancelled
          ? 'cancelled'
          : 'complete'
        : 'idle';

  const isActive = status !== 'idle';
  const isVisible = isActive && !isDismissed;

  const doneCount = tracks.reduce((count, track) => (track.status === 'complete' || track.status === 'skipped' ? count + 1 : count), 0);
  const percentage = totalTracks > 0 ? Math.floor((doneCount / totalTracks) * 100) : 0;

  const openDashboard = useCallback(() => setIsDashboardOpen(true), []);
  const closeDashboard = useCallback(() => setIsDashboardOpen(false), []);
  const dismissDock = useCallback(() => {
    setIsDismissed(true);
    setIsDashboardOpen(false);
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
