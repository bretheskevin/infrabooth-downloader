import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransportButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  iconClassName?: string;
}

export function TransportSkipBack({ onClick, label, className, iconClassName }: TransportButtonProps) {
  return (
    <Button variant="ghost" size="icon" className={className} onClick={onClick} aria-label={label}>
      <SkipBack className={cn('h-5 w-5', iconClassName)} />
    </Button>
  );
}

export function TransportSkipForward({ onClick, label, className, iconClassName }: TransportButtonProps) {
  return (
    <Button variant="ghost" size="icon" className={className} onClick={onClick} aria-label={label}>
      <SkipForward className={cn('h-5 w-5', iconClassName)} />
    </Button>
  );
}

interface TransportPlayPauseProps extends TransportButtonProps {
  isPlaying: boolean;
  isLoading?: boolean;
}

export function TransportPlayPause({ isPlaying, isLoading, onClick, label, className, iconClassName }: TransportPlayPauseProps) {
  const Icon = isPlaying ? Pause : Play;
  return (
    <Button variant="default" size="icon" className={cn('h-10 w-10 rounded-full', className)} onClick={onClick} aria-label={label}>
      {isLoading ? (
        <Loader2 className={cn('h-5 w-5 animate-spin', iconClassName)} />
      ) : (
        <Icon className={cn('h-5 w-5', iconClassName)} fill="currentColor" />
      )}
    </Button>
  );
}
