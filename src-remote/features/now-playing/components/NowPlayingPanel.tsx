import { useState } from 'react';
import type { AnimationEvent } from 'react';
import { AudioLines, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';
import { t } from '@remote/lib/i18n';
import PanelIconButton from '@remote/components/PanelIconButton';
import QueuePanel from '@remote/features/queue/components/QueuePanel';
import NowPlaying from './NowPlaying';
import Transport from './Transport';

interface Props {
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  language: string;
  onClose: () => void;
  onOpenVisualizer: () => void;
}

export default function NowPlayingPanel({ state, send, language, onClose, onOpenVisualizer }: Props) {
  const [closing, setClosing] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && closing) onClose();
  }

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      className={cn(
        'absolute inset-0 z-30 flex flex-col bg-background pb-[env(safe-area-inset-bottom)] duration-300',
        closing ? 'animate-out slide-out-to-bottom fill-mode-forwards' : 'animate-in slide-in-from-bottom',
      )}
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border">
        <p className="text-sm font-semibold">{t('nowPlaying', language)}</p>
        <div className="flex items-center gap-1">
          <PanelIconButton aria-label={t('visualizerOpen', language)} onClick={onOpenVisualizer}>
            <AudioLines />
          </PanelIconButton>
          <PanelIconButton aria-label={t('close', language)} onClick={() => setClosing(true)}>
            <ChevronDown />
          </PanelIconButton>
        </div>
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
