import { useState } from 'react';
import type { AnimationEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';
import { t } from '@remote/lib/i18n';
import QueuePanel from '@remote/features/queue/components/QueuePanel';
import NowPlaying from './NowPlaying';
import Transport from './Transport';

interface Props {
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  language: string;
  onClose: () => void;
}

export default function NowPlayingPanel({ state, send, language, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && closing) onClose();
  }

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      className={cn(
        'absolute inset-0 z-30 flex flex-col bg-background duration-300',
        closing ? 'animate-out slide-out-to-bottom fill-mode-forwards' : 'animate-in slide-in-from-bottom',
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">{t('nowPlaying', language)}</p>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setClosing(true)}>
          <ChevronDown />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto relative">
        <NowPlaying state={state} language={language} onCommand={send} />
        {state?.currentTrack && (
          <Transport
            state={state}
            send={send}
            language={language}
            queueOpen={queueOpen}
            onToggleQueue={() => setQueueOpen((open) => !open)}
          />
        )}
      </div>
      {queueOpen && <QueuePanel state={state} send={send} language={language} onClose={() => setQueueOpen(false)} />}
    </div>
  );
}
