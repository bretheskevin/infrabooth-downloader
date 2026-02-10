import { AlertTriangle } from 'lucide-react';
import type { FailedTrack } from '@/types/download';

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
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {track.title}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {track.artist}
        </p>
      </div>
    </div>
  );
}
