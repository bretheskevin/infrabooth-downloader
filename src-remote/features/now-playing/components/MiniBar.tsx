import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RemoteState, RemoteCommand } from '@/lib/remote-protocol';
import { getArtworkUrl } from '@/lib/soundcloud';

interface Props {
  state: RemoteState | null;
  send: (cmd: RemoteCommand) => void;
  onExpand: () => void;
}

export default function MiniBar({ state, send, onExpand }: Props) {
  const track = state?.currentTrack;
  if (!track) return null;

  const isPlaying = state?.state === 'playing';
  const artworkUrl = getArtworkUrl(track.artworkUrl, 50);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-card">
      <button onClick={onExpand} className="flex flex-1 items-center gap-3 min-w-0 text-left">
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded flex-shrink-0 bg-secondary" />
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
          <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
        </div>
      </button>
      <Button
        size="icon"
        onClick={() => send(isPlaying ? { type: 'pause' } : { type: 'resume' })}
        className="h-10 w-10 rounded-full flex-shrink-0"
      >
        {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
      </Button>
    </div>
  );
}
