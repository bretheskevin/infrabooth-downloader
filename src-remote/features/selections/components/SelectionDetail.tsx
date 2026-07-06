import { ChevronLeft, Play } from 'lucide-react';
import type { RemoteCommand, RemoteState } from '@/lib/remote-protocol';
import { Button } from '@/components/ui/button';
import { t } from '@remote/lib/i18n';
import TrackList from '@remote/components/TrackList';
import { sendPlayToggle } from '@remote/lib/playToggle';
import type { RemoteSelection } from '../api/selections';

interface Props {
  selection: RemoteSelection;
  language: string;
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  onBack: () => void;
}

export default function SelectionDetail({ selection, language, state, send, onBack }: Props) {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 px-2 text-muted-foreground">
            <ChevronLeft className="size-4" />
            {t('back', language)}
          </Button>
        </div>
        <div className="px-4 pb-3">
          <h2 className="text-base font-semibold text-foreground truncate">{selection.title}</h2>
          <p className="text-xs text-muted-foreground">
            {selection.trackCount} {t('tracks', language)}
          </p>
          {selection.tracks.length > 0 && (
            <Button size="sm" className="mt-2 gap-1" onClick={() => send({ type: 'playTracks', tracks: selection.tracks, startIndex: 0 })}>
              <Play className="size-3" fill="currentColor" />
              {t('playAll', language)}
            </Button>
          )}
        </div>
      </div>
      <TrackList
        tracks={selection.tracks}
        state={state}
        send={send}
        language={language}
        onPlay={(track, index) => sendPlayToggle(send, state, track, selection.tracks, index)}
      />
    </div>
  );
}
