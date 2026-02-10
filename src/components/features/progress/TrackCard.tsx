import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Music } from 'lucide-react';
import { TrackStatusBadge } from './TrackStatusBadge';
import { GeoBlockTooltip } from './GeoBlockTooltip';
import { GeoBlockDetails } from './GeoBlockDetails';
import { isGeoBlockedError } from '@/lib/errorMessages';
import type { Track } from '@/types/track';

export interface TrackCardProps {
  track: Track;
  isCurrentTrack: boolean;
}

// Detect touch device - check once at module load for performance
const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function TrackCard({ track, isCurrentTrack }: TrackCardProps) {
  const isActive = track.status === 'downloading' || track.status === 'converting';
  const isGeoBlocked = isGeoBlockedError(track.error);

  const statusBadge = (
    <TrackStatusBadge
      status={track.status}
      error={track.error}
      className="flex-shrink-0"
    />
  );

  return (
    <div
      role="listitem"
      aria-current={isCurrentTrack ? 'true' : undefined}
      aria-label={`${track.title} by ${track.artist}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-md',
        'border-b border-border last:border-b-0',
        'transition-colors duration-150',
        isActive && 'bg-indigo-50 border border-indigo-200',
        !isActive && isCurrentTrack && 'bg-primary/10 border-l-2 border-l-primary'
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
        {/* Expandable details for touch devices */}
        {isGeoBlocked && isTouchDevice && (
          <div className="mt-1">
            <GeoBlockDetails />
          </div>
        )}
      </div>

      {/* Status Badge - with tooltip for desktop geo-blocked */}
      {isGeoBlocked && !isTouchDevice ? (
        <GeoBlockTooltip>{statusBadge}</GeoBlockTooltip>
      ) : (
        statusBadge
      )}
    </div>
  );
}
