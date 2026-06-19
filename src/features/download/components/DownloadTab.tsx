import type { TrackInfo } from '@/bindings';
import { useDownloadPipeline } from '../hooks/useDownloadPipeline';
import { DownloadMainView } from './DownloadMainView';

interface DownloadTabProps {
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function DownloadTab({ onDownloadTracks }: DownloadTabProps) {
  const { flow } = useDownloadPipeline();

  return <DownloadMainView flow={flow} onDownloadTracks={onDownloadTracks} />;
}
