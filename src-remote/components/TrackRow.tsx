import { Play, Pause, Plus, Download, Loader2, Check } from 'lucide-react';
import type { RemoteTrack, RemoteState } from '@/lib/remote-protocol';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  track: RemoteTrack;
  state: RemoteState | null;
  onPlay: () => void;
  onQueue: () => void;
  onDownload: () => void;
}

export default function TrackRow({ track, state, onPlay, onQueue, onDownload }: Props) {
  const artworkUrl = track.artworkUrl?.replace('-large', '-t50x50') ?? null;
  const isCurrent = state?.currentTrack?.trackId === track.trackId;
  const isPlaying = isCurrent && state?.state === 'playing';
  const isDownloading = state?.downloadingTrackIds.includes(track.trackId) ?? false;
  const isDownloaded = state?.downloadedTrackIds.includes(track.trackId) ?? false;

  return (
    <li onClick={onPlay} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
      <div className={cn('relative w-10 h-10 flex-shrink-0 rounded overflow-hidden', isCurrent && 'ring-2 ring-primary')}>
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
          {isPlaying ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('truncate text-sm font-medium', isCurrent ? 'text-primary' : 'text-foreground')}>{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onQueue();
          }}
          className="h-11 w-11 text-muted-foreground"
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={isDownloading || isDownloaded}
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className={cn('h-11 w-11', isDownloaded ? 'text-success' : 'text-muted-foreground')}
        >
          {isDownloading ? <Loader2 className="animate-spin text-primary" /> : isDownloaded ? <Check /> : <Download />}
        </Button>
      </div>
    </li>
  );
}
