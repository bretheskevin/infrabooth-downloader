import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = () => usePlayerStore.getState();

interface TransportControlsProps {
  className?: string;
}

export function TransportControls({ className }: TransportControlsProps) {
  const { state, isShuffled } = usePlayerStore(
    useShallow((s) => ({ state: s.state, isShuffled: s.isShuffled }))
  );

  const isPlaying = state === 'playing';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="ghost" size="icon" onClick={() => actions().previous()}>
        <SkipBack className="h-5 w-5" />
      </Button>
      <Button variant="default" size="icon" className="h-10 w-10 rounded-full"
        onClick={isPlaying ? () => actions().pause() : () => actions().resume()}>
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => actions().next()}>
        <SkipForward className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => actions().toggleShuffle()}
        className={cn(isShuffled && 'text-primary')}>
        <Shuffle className="h-4 w-4" />
      </Button>
    </div>
  );
}
