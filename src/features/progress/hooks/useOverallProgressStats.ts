import { useQueueStore } from '@/features/queue/store';

interface OverallProgressStats {
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  percentage: number;
  hasActiveTrack: boolean;
  hasPendingTrack: boolean;
  showPreparing: boolean;
  showCancelButton: boolean;
}

export function useOverallProgressStats(): OverallProgressStats {
  const tracks = useQueueStore((state) => state.tracks);

  const totalCount = tracks.length;
  let completedCount = 0;
  let skippedCount = 0;
  for (const track of tracks) {
    if (track.status === 'skipped') {
      skippedCount++;
      completedCount++;
    } else if (track.status === 'complete') {
      completedCount++;
    }
  }

  const hasActiveTrack = tracks.some((track) => track.status === 'downloading' || track.status === 'converting');
  const hasPendingTrack = tracks.some((track) => track.status === 'pending');

  const percentage = totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0;
  const showPreparing = !hasActiveTrack && hasPendingTrack;
  const showCancelButton = hasActiveTrack || hasPendingTrack;

  return {
    totalCount,
    completedCount,
    skippedCount,
    percentage,
    hasActiveTrack,
    hasPendingTrack,
    showPreparing,
    showCancelButton,
  };
}
