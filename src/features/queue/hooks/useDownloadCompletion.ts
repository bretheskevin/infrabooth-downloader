import { useShallow } from 'zustand/react/shallow';
import { useQueueStore } from '@/features/queue/store';

interface DownloadCompletionState {
  isComplete: boolean;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  totalCount: number;
  hasFailures: boolean;
  isFullSuccess: boolean;
  isCancelled: boolean;
  resetQueue: () => void;
}

export function useDownloadCompletion(): DownloadCompletionState {
  const { isComplete, completedCount, failedCount, cancelledCount, isCancelled, totalCount } =
    useQueueStore(
      useShallow((state) => ({
        isComplete: state.isComplete,
        completedCount: state.completedCount,
        failedCount: state.failedCount,
        cancelledCount: state.cancelledCount,
        isCancelled: state.isCancelled,
        totalCount: state.totalTracks,
      }))
    );

  return {
    isComplete,
    completedCount,
    failedCount,
    cancelledCount,
    totalCount,
    hasFailures: failedCount > 0,
    isFullSuccess: isComplete && failedCount === 0 && !isCancelled,
    isCancelled,
    resetQueue: () => useQueueStore.getState().clearQueue(),
  };
}
