import { memo } from 'react';
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

const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const TrackCard = memo(function TrackCard({
  track,
  isCurrentTrack,
  isInitializing = false,
}: TrackCardProps) {
  const { t } = useTranslation();
  const isActive = track.status === 'downloading' || track.status === 'converting';
  const isGeoBlocked = isGeoBlockedError(track.error);
  const isUnavailable = isUnavailableError(track.error);

  const showInitializing = isInitializing && track.status === 'pending';

  const statusBadge = (
    <TrackStatusBadge
      status={track.status}
      error={track.error}
      className="flex-shrink-0"
    />
  );

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

  const renderStatusBadge = () => {
    if (showInitializing) {
      return initializingBadge;
    }
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
        'flex items-center gap-4 px-4 py-3 rounded-xl overflow-hidden',
        'transition-all duration-200',
        'hover:bg-secondary/50',
        (isActive || showInitializing) && 'bg-primary/10 ring-1 ring-primary/30',
        !isActive && !showInitializing && isCurrentTrack && 'bg-primary/5'
      )}
    >
      <Avatar className="h-12 w-12 rounded-lg flex-shrink-0 shadow-sm">
        {track.artworkUrl ? (
          <AvatarImage
            src={track.artworkUrl}
            alt={track.title}
            className="rounded-lg object-cover"
            loading="lazy"
          />
        ) : null}
        <AvatarFallback
          className="rounded-lg bg-secondary"
          data-testid="artwork-fallback"
        >
          <Music className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          (isActive || showInitializing) && 'text-primary'
        )}>{track.title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist}</p>
        {isGeoBlocked && isTouchDevice && (
          <div className="mt-1.5">
            <GeoBlockDetails />
          </div>
        )}
        {isUnavailable && isTouchDevice && (
          <div className="mt-1.5">
            <UnavailableTrackDetails />
          </div>
        )}
      </div>

      <div className="flex-shrink-0">
        {renderStatusBadge()}
      </div>
    </div>
  );
});
