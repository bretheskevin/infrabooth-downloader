import { cn } from '@/lib/utils';
import { PreviousButton, PlayPauseButton, NextButton, ShuffleButton } from './TransportButtons';

interface TransportControlsProps {
  className?: string;
}

export function TransportControls({ className }: TransportControlsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PreviousButton />
      <PlayPauseButton />
      <NextButton />
      <ShuffleButton />
    </div>
  );
}
