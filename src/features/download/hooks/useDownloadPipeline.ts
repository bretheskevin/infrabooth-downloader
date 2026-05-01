import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQueueStore, useDownloadFlow, useDownloadCompletion } from '@/features/queue';

export type DownloadFlow = ReturnType<typeof useDownloadFlow>;
type DownloadCompletion = ReturnType<typeof useDownloadCompletion>;

export type PipelineView =
  | { type: 'complete'; completion: DownloadCompletion; onDownloadAnother: () => void }
  | { type: 'processing' }
  | { type: 'pending' }
  | { type: 'main'; flow: DownloadFlow };

export function useDownloadPipeline(): PipelineView {
  const { isProcessing, isInitializing } = useQueueStore(
    useShallow((s) => ({ isProcessing: s.isProcessing, isInitializing: s.isInitializing }))
  );

  const flow = useDownloadFlow();
  const completion = useDownloadCompletion();

  const { setUrl } = flow;

  const onDownloadAnother = useCallback(() => {
    useQueueStore.getState().clearQueue();
    setUrl('');
  }, [setUrl]);

  if (completion.isComplete) {
    return { type: 'complete', completion, onDownloadAnother };
  }

  if (isProcessing) {
    return { type: 'processing' };
  }

  if (flow.isPending || isInitializing) {
    return { type: 'pending' };
  }

  return { type: 'main', flow };
}
