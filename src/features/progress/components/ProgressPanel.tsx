import { cn } from '@/lib/utils';
import { useSticky } from '@/hooks/useSticky';
import { OverallProgress } from './OverallProgress';
import { TrackList } from './TrackList';

const GLASSMORPHISM_STYLES = [
  'bg-card/80 backdrop-blur-2xl',
  'border border-border/40',
  'shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]',
  'dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]',
  'dark:bg-card/90',
] as const;

const TRANSPARENT_STYLES = [
  'bg-card/50',
  'border border-border/20',
  'shadow-sm',
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
