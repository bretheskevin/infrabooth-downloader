import { useDownloadFlow } from '@/features/queue';

export type DownloadFlow = ReturnType<typeof useDownloadFlow>;

export interface DownloadPipelineResult {
  flow: DownloadFlow;
}

export function useDownloadPipeline(): DownloadPipelineResult {
  const flow = useDownloadFlow();

  return { flow };
}
