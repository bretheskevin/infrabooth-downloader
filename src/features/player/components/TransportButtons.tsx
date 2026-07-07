import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../store';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransportSkipBack, TransportSkipForward, TransportPlayPause } from '@/components/transport-buttons';

const actions = () => usePlayerStore.getState();

interface TransportButtonProps {
  className?: string;
  iconClassName?: string;
}

export function PreviousButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  return (
    <TransportSkipBack
      onClick={() => actions().previous()}
      label={t('player.previous')}
      className={className}
      iconClassName={iconClassName}
    />
  );
}

export function NextButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  return (
    <TransportSkipForward onClick={() => actions().next()} label={t('player.next')} className={className} iconClassName={iconClassName} />
  );
}

export function PlayPauseButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  const state = usePlayerStore((s) => s.state);
  const isPlaying = state === 'playing';
  return (
    <TransportPlayPause
      isPlaying={isPlaying}
      onClick={isPlaying ? () => actions().pause() : () => actions().resume()}
      label={isPlaying ? t('player.pause') : t('player.play')}
      className={className}
      iconClassName={iconClassName}
    />
  );
}

export function ShuffleButton({ className, iconClassName }: TransportButtonProps) {
  const { t } = useTranslation();
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(className, isShuffled && 'text-primary')}
      onClick={() => actions().toggleShuffle()}
      aria-label={t('player.shuffle')}
    >
      <Shuffle className={cn('h-4 w-4', iconClassName)} />
    </Button>
  );
}
