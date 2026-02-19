import { useQueueStore } from '@/features/queue/store';

interface OverallProgressStats {
  totalCount: number;
  completedCount: number;
  percentage: number;
  hasActiveTrack: boolean;
  hasPendingTrack: boolean;
  showPreparing: boolean;
  showCancelButton: boolean;
}

export function useOverallProgressStats(): OverallProgressStats {
  const tracks = useQueueStore((state) => state.tracks);

  const totalCount = tracks.length;
  const completedCount = tracks.filter((track) => track.status === 'complete').length;

  const hasActiveTrack = tracks.some(
    (track) => track.status === 'downloading' || track.status === 'converting'
  );
  const hasPendingTrack = tracks.some((track) => track.status === 'pending');

  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const showPreparing = !hasActiveTrack && hasPendingTrack;
  const showCancelButton = hasActiveTrack || hasPendingTrack;

  return {
    totalCount,
    completedCount,
    percentage,
    hasActiveTrack,
    hasPendingTrack,
    showPreparing,
    showCancelButton,
  };
}
