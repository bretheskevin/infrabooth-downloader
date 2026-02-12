import { AlertTriangle } from 'lucide-react';
import type { FailedTrack } from '@/features/download/types/download';

interface FailedTrackItemProps {
  track: FailedTrack;
}

export function FailedTrackItem({ track }: FailedTrackItemProps) {
  return (
    <div
      role="listitem"
      className="flex items-start gap-2 py-1.5"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {track.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artist}
        </p>
      </div>
    </div>
  );
}
