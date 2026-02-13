import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Music, Loader2 } from 'lucide-react';
import { TrackStatusBadge } from './TrackStatusBadge';
import { GeoBlockTooltip } from './GeoBlockTooltip';
import { GeoBlockDetails } from './GeoBlockDetails';
import { UnavailableTrackTooltip } from './UnavailableTrackTooltip';
import { UnavailableTrackDetails } from './UnavailableTrackDetails';
import { isGeoBlockedError, isUnavailableError } from '@/lib/errorMessages';
import { useTranslation } from 'react-i18next';
import type { Track } from '@/features/queue/types/track';

export interface TrackCardProps {
  track: Track;
  isCurrentTrack: boolean;
  isInitializing?: boolean;
}

// Detect touch device - check once at module load for performance
const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function TrackCard({ track, isCurrentTrack, isInitializing = false }: TrackCardProps) {
  const { t } = useTranslation();
  const isActive = track.status === 'downloading' || track.status === 'converting';
  const isGeoBlocked = isGeoBlockedError(track.error);
  const isUnavailable = isUnavailableError(track.error);

  // Show initializing state only for first track when starting download
  const showInitializing = isInitializing && track.status === 'pending';

  const statusBadge = (
    <TrackStatusBadge
      status={track.status}
      error={track.error}
      className="flex-shrink-0"
    />
  );

  // Initializing badge with spinner
  const initializingBadge = (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 flex-shrink-0"
    >
      <Loader2
        role="img"
        aria-label={t('download.startingDownload')}
        className="h-4 w-4 flex-shrink-0 text-primary animate-spin"
      />
      <span className="text-xs font-medium text-primary">
        {t('download.startingDownload')}
      </span>
    </div>
  );

  // Determine which tooltip/details to show
  const renderStatusBadge = () => {
    // Show initializing badge when starting
    if (showInitializing) {
      return initializingBadge;
    }
    // Geo-blocked takes priority if both would match
    if (isGeoBlocked && !isTouchDevice) {
      return <GeoBlockTooltip>{statusBadge}</GeoBlockTooltip>;
    }
    if (isUnavailable && !isTouchDevice) {
      return <UnavailableTrackTooltip>{statusBadge}</UnavailableTrackTooltip>;
    }
    return statusBadge;
  };

  return (
    <div
      role="listitem"
      aria-current={isCurrentTrack ? 'true' : undefined}
      aria-label={`${track.title} by ${track.artist}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-md overflow-hidden',
        'border-b border-border last:border-b-0',
        'transition-colors duration-150',
        (isActive || showInitializing) && 'bg-primary/10 border border-primary/30',
        !isActive && !showInitializing && isCurrentTrack && 'bg-primary/10 border-l-2 border-l-primary'
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
      <div className="flex-1 w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        {/* Expandable details for touch devices */}
        {isGeoBlocked && isTouchDevice && (
          <div className="mt-1">
            <GeoBlockDetails />
          </div>
        )}
        {isUnavailable && isTouchDevice && (
          <div className="mt-1">
            <UnavailableTrackDetails />
          </div>
        )}
      </div>

      {/* Status Badge - with tooltip for desktop errors */}
      <div className="flex-shrink-0">
        {renderStatusBadge()}
      </div>
    </div>
  );
}
