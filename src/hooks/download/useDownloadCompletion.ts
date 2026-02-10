import { useQueueStore } from '@/stores/queueStore';

interface DownloadCompletionState {
  isComplete: boolean;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  hasFailures: boolean;
  isFullSuccess: boolean;
  resetQueue: () => void;
}

/**
 * Hook for accessing download completion state.
 * Derives completion status from the queueStore.
 *
 * @returns Completion state and actions
 */
export function useDownloadCompletion(): DownloadCompletionState {
  const isComplete = useQueueStore((state) => state.isComplete);
  const completedCount = useQueueStore((state) => state.completedCount);
  const failedCount = useQueueStore((state) => state.failedCount);
  const totalCount = useQueueStore((state) => state.totalTracks);
  const clearQueue = useQueueStore((state) => state.clearQueue);

  return {
    isComplete,
    completedCount,
    failedCount,
    totalCount,
    hasFailures: failedCount > 0,
    isFullSuccess: isComplete && failedCount === 0,
    resetQueue: clearQueue,
  };
}
