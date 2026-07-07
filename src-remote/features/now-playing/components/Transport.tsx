import type { CSSProperties } from 'react';
import { Volume2, VolumeX, ListMusic } from 'lucide-react';
import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TransportSkipBack, TransportSkipForward, TransportPlayPause } from '@/components/transport-buttons';
import { t } from '@remote/lib/i18n';

interface Props {
  state: RemoteState;
  send: (cmd: RemoteCommand) => void;
  language: string;
  queueOpen: boolean;
  onToggleQueue: () => void;
}

export default function Transport({ state, send, language, queueOpen, onToggleQueue }: Props) {
  const isPlaying = state.state === 'playing';

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-center gap-8">
        <TransportSkipBack onClick={() => send({ type: 'previous' })} className="h-11 w-11 [&_svg]:size-5" />
        <TransportPlayPause
          isPlaying={isPlaying}
          onClick={() => send(isPlaying ? { type: 'pause' } : { type: 'resume' })}
          className="h-16 w-16 rounded-full [&_svg]:size-7"
        />
        <TransportSkipForward onClick={() => send({ type: 'next' })} className="h-11 w-11 [&_svg]:size-5" />
      </div>
      <div className="flex items-center gap-2">
        {state.volume === 0 ? (
          <VolumeX className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Volume2 className="size-4 shrink-0 text-muted-foreground" />
        )}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={state.volume}
          onChange={(e) => send({ type: 'setVolume', volume: Number(e.target.value) })}
          className="slider flex-1"
          style={{ '--vol-pct': `${state.volume * 100}%` } as CSSProperties}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleQueue}
          aria-label={t('queue', language)}
          className={cn('h-11 w-11 text-muted-foreground', queueOpen && 'text-primary bg-primary/10')}
        >
          <ListMusic />
        </Button>
      </div>
    </div>
  );
}
