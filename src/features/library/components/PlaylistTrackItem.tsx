import { Music } from 'lucide-react';
import type { TrackInfo } from '@/bindings';

interface PlaylistTrackItemProps {
  track: TrackInfo;
  index: number;
  staggerIndex: number;
  animate?: boolean;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const MAX_STAGGER_ITEMS = 15;
const STAGGER_DELAY_MS = 25;

export function PlaylistTrackItem({ track, index, staggerIndex, animate = true }: PlaylistTrackItemProps) {
  const delay = animate && staggerIndex < MAX_STAGGER_ITEMS ? staggerIndex * STAGGER_DELAY_MS : 0;
  const artworkUrl = track.artwork_url ?? null;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors${animate ? ' track-row-stagger' : ''}`}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span className="w-8 text-right text-xs text-muted-foreground tabular-nums shrink-0">
        {index + 1}
      </span>
      <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Music className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.user.username}</p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {formatDuration(track.duration)}
      </span>
    </div>
  );
}
