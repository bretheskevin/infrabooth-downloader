import { useState } from 'react';
import type { AnimationEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';
import { t } from '@remote/dict';
import QueueList from './QueueList';

interface Props {
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  language: string;
  onClose: () => void;
}

export default function QueuePanel({ state, send, language, onClose }: Props) {
  const [closing, setClosing] = useState(false);

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && closing) onClose();
  }

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      className={cn(
        'absolute inset-0 z-20 flex flex-col bg-card duration-300',
        closing ? 'animate-out slide-out-to-bottom fill-mode-forwards' : 'animate-in slide-in-from-bottom',
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="text-sm font-semibold">{t('queue', language)}</p>
          <p className="text-xs text-muted-foreground">
            {state?.queue.length ?? 0} {t('tracks', language)}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setClosing(true)}>
          <ChevronDown />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <QueueList state={state} send={send} language={language} />
      </div>
    </div>
  );
}
