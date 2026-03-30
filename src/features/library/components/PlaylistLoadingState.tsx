import { TrackRowSkeletonList } from '@/components/TrackRowSkeleton';


interface PlaylistLoadingStateProps {
  showSkeleton: boolean;
}

export function PlaylistLoadingState({ showSkeleton }: PlaylistLoadingStateProps) {
  if (!showSkeleton) return null;

  return <TrackRowSkeletonList />;
}
