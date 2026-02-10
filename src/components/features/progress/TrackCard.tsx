import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Music } from 'lucide-react';
import type { Track } from '@/types/track';

export interface TrackCardProps {
  track: Track;
  isCurrentTrack: boolean;
}

export function TrackCard({ track, isCurrentTrack }: TrackCardProps) {
  return (
    <div
      role="listitem"
      aria-current={isCurrentTrack ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 p-3 rounded-md',
        'border-b border-border last:border-b-0',
        'transition-colors duration-150',
        isCurrentTrack && 'bg-primary/10 border-l-2 border-l-primary'
      )}
    >
      {/* Artwork - 48x48px */}
      <Avatar className="h-12 w-12 rounded-md flex-shrink-0">
        {track.artworkUrl ? (
          <AvatarImage
            src={track.artworkUrl}
            alt={track.title}
            className="rounded-md object-cover"
          />
        ) : null}
        <AvatarFallback
          className="rounded-md bg-muted"
          data-testid="artwork-fallback"
        >
          <Music className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </AvatarFallback>
      </Avatar>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Status indicator placeholder - implemented in Story 5.2 */}
      <div className="flex-shrink-0 w-6">
        {/* Status icon will go here */}
      </div>
    </div>
  );
}
