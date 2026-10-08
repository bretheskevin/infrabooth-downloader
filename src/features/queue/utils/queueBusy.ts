import type { QueueState } from '../store/types';

export type QueueBusyFields = Pick<QueueState, 'isProcessing' | 'isCancelling' | 'isComplete' | 'failedCount'>;

export function isDownloadQueueBusy({ isProcessing, isCancelling, isComplete, failedCount }: QueueBusyFields): boolean {
  return isProcessing || isCancelling || (isComplete && failedCount > 0);
}
