import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../store';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = () => usePlayerStore.getState();

interface TransportButtonProps {
  className?: string;
  iconClassName?: string;
}

export function PreviousButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  return (
    <Button variant="ghost" size="icon" className={className} onClick={() => actions().previous()} aria-label={t('player.previous')}>
      <SkipBack className={cn('h-5 w-5', iconClassName)} />
    </Button>
  );
}

export function NextButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  return (
    <Button variant="ghost" size="icon" className={className} onClick={() => actions().next()} aria-label={t('player.next')}>
      <SkipForward className={cn('h-5 w-5', iconClassName)} />
    </Button>
  );
}

export function PlayPauseButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  const state = usePlayerStore((s) => s.state);
  const isPlaying = state === 'playing';
  return (
    <Button
      variant="default"
      size="icon"
      className={cn('h-10 w-10 rounded-full', className)}
      onClick={isPlaying ? () => actions().pause() : () => actions().resume()}
      aria-label={isPlaying ? t('player.pause') : t('player.play')}
    >
      {isPlaying
        ? <Pause className={cn('h-5 w-5', iconClassName)} />
        : <Play className={cn('h-5 w-5 ml-0.5', iconClassName)} />}
    </Button>
  );
}

export function ShuffleButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  return (
    <Button variant="ghost" size="icon" className={cn(className, isShuffled && 'text-primary')} onClick={() => actions().toggleShuffle()} aria-label={t('player.shuffle')}>
      <Shuffle className={cn('h-4 w-4', iconClassName)} />
    </Button>
  );
}
