import { cn } from '@/lib/utils';
import { OverallProgress } from './OverallProgress';
import { TrackList } from './TrackList';

interface ProgressPanelProps {
  className?: string;
}

export function ProgressPanel({ className }: ProgressPanelProps) {
  return (
    <div
      data-testid="progress-panel"
      className={cn('flex flex-col h-full', className)}
    >
      {/* Overall progress - positioned above track list */}
      <div className="px-4 py-2">
        <OverallProgress />
      </div>

      {/* Track list with scroll */}
      <div className="flex-1 min-h-0">
        <TrackList />
      </div>
    </div>
  );
}
