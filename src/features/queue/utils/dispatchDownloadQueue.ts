import type { Track } from '@/features/queue/types/track';
import { startDownloadQueue } from '../api/download';
import { queueTrackToDownloadRequest } from './transforms';

interface DispatchDownloadQueueParams {
  queueTracks: Track[];
  albumName: string | null;
  outputDir: string | null;
  maxConcurrent: number;
  preserveOrder: boolean;
  enqueueTracks: (tracks: Track[]) => void;
  setOutputDir: (dir: string | null) => void;
  setInitializing: (v: boolean) => void;
}

export async function dispatchDownloadQueue({
  queueTracks,
  albumName,
  outputDir,
  maxConcurrent,
  preserveOrder,
  enqueueTracks,
  setOutputDir,
  setInitializing,
}: DispatchDownloadQueueParams): Promise<void> {
  enqueueTracks(queueTracks);
  setOutputDir(outputDir);
  setInitializing(true);

  try {
    await startDownloadQueue({
      tracks: queueTracks.map(queueTrackToDownloadRequest),
      albumName,
      outputDir,
      maxConcurrent,
      preserveOrder,
    });
  } catch (error) {
    setInitializing(false);
    throw error;
  }
}
