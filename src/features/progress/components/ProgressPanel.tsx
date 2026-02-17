import { cn } from '@/lib/utils';
import { useSticky } from '@/hooks/useSticky';
import { OverallProgress } from './OverallProgress';
import { TrackList } from './TrackList';

const GLASSMORPHISM_STYLES = [
  'bg-card/70 backdrop-blur-xl',
  'border border-border/30',
  'shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]',
  'dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.25)]',
] as const;

const TRANSPARENT_STYLES = [
  'bg-transparent',
  'border border-transparent',
  'shadow-none',
] as const;

interface ProgressPanelProps {
  className?: string;
}

export function ProgressPanel({ className }: ProgressPanelProps) {
  const { sentinelRef, isStuck } = useSticky();

  return (
    <div
      data-testid="progress-panel"
      className={cn('flex flex-col h-full', className)}
    >
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className={cn(
          'sticky top-0 z-10 px-2 pb-3',
          'transition-[padding] duration-300 ease-out',
          isStuck && 'pt-3'
        )}
      >
        <div
          className={cn(
            'px-4 py-3 rounded-xl',
            'transition-all duration-300 ease-out',
            isStuck ? GLASSMORPHISM_STYLES : TRANSPARENT_STYLES
          )}
        >
          <OverallProgress />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TrackList />
      </div>
    </div>
  );
}
