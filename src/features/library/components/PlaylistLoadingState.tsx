import { Skeleton } from '@/components/ui/skeleton';

function TrackSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="w-8 h-8 rounded shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-10 shrink-0" />
    </div>
  );
}

interface PlaylistLoadingStateProps {
  showSkeleton: boolean;
}

export function PlaylistLoadingState({ showSkeleton }: PlaylistLoadingStateProps) {
  if (!showSkeleton) return null;

  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <TrackSkeletonRow key={i} />
      ))}
    </div>
  );
}
