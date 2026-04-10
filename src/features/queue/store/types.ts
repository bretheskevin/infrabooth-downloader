import type { Track } from '@/features/queue/types/track';
import type { QueueCancelledEvent, QueueCompleteEvent } from '@/bindings';

export interface QueueStateSlice {
  tracks: Track[];
  currentIndex: number;
  totalTracks: number;
  isProcessing: boolean;
  isInitializing: boolean;
  outputDir: string | null;
  enqueueTracks: (tracks: Track[]) => void;
  updateTrackStatus: (
    id: string,
    status: Track['status'],
    error?: Track['error'],
    progress?: { percent?: number; downloadedBytes?: number; totalBytes?: number; filePath?: string }
  ) => void;
  clearQueue: () => void;
  setInitializing: (isInitializing: boolean) => void;
  setOutputDir: (path: string | null) => void;
}

export interface QueueProgressSlice {
  isComplete: boolean;
  isCancelling: boolean;
  isCancelled: boolean;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  setQueueProgress: (current: number, total: number) => void;
  setQueueComplete: (result: QueueCompleteEvent) => void;
  setQueueCancelled: (result: QueueCancelledEvent) => void;
  setCancelling: (isCancelling: boolean) => void;
}

export interface QueueRetrySlice {
  isRetrying: boolean;
  prepareRetryFailed: () => Track[];
  prepareRetrySingle: (trackId: string) => Track | null;
  setRetrying: (isRetrying: boolean) => void;
}

export type QueueState = QueueStateSlice & QueueProgressSlice & QueueRetrySlice;

export const INITIAL_QUEUE_STATE = {
  currentIndex: 0,
  isProcessing: false,
  isInitializing: false,
  isComplete: false,
  isCancelling: false,
  isCancelled: false,
  completedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
  outputDir: null as string | null,
  isRetrying: false,
};
