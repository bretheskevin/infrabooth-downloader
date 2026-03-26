import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Repeat2, Sparkles } from 'lucide-react';
import { usePlayPauseToggle } from '@/hooks/usePlayPauseToggle';
import { useHoverPreload } from '@/hooks/useHoverPreload';
import { Checkbox } from '@/components/ui/checkbox';
import { TrackRow } from '@/components/TrackRow';
import { TrackDownloadAction } from '@/components/TrackDownloadAction';
import { EqualizerBars } from '@/features/player/components/EqualizerBars';
import { getArtworkUrl } from '@/lib/soundcloud';
import { formatRelativeTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { ActivityItem, TrackInfo } from '@/bindings';
import type { DownloadState } from '@/types/download';

interface ArtistTrackItemProps {
  item: ActivityItem;
  index: number;
  staggerIndex: number;
  animate?: boolean;
  isSelected: boolean;
  onToggle: (id: number) => void;
  downloadState: DownloadState;
  onDownload: (track: TrackInfo) => void;
  onPlay?: (index: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  isCurrentlyPlaying?: boolean;
  isPlayerPlaying?: boolean;
  onHoverTrack?: (track: TrackInfo) => (() => void) | undefined;
  onMouseDownTrack?: (track: TrackInfo) => void;
  isDownloadEnabled: boolean;
}

const MAX_STAGGER_ITEMS = 15;
const STAGGER_DELAY_MS = 25;

export const ArtistTrackItem = memo(function ArtistTrackItem({
  item,
  index,
  staggerIndex,
  animate = true,
  isSelected,
  onToggle,
  downloadState,
  onDownload,
  onPlay,
  onPause,
  onResume,
  isCurrentlyPlaying = false,
  isPlayerPlaying = false,
  onHoverTrack,
  onMouseDownTrack,
  isDownloadEnabled,
}: ArtistTrackItemProps) {
  const { t } = useTranslation();
  const { track, activity_type, created_at } = item;
  const delay = animate && staggerIndex < MAX_STAGGER_ITEMS ? staggerIndex * STAGGER_DELAY_MS : 0;
  const isDownloaded = downloadState.status === 'completed';

  const boundHover = useCallback(() => onHoverTrack?.(track), [onHoverTrack, track]);
  const { onHoverStart, onHoverEnd } = useHoverPreload(boundHover);
  const handleMouseDown = useCallback(() => onMouseDownTrack?.(track), [onMouseDownTrack, track]);

  const handleToggle = useCallback(() => onToggle(track.id), [onToggle, track.id]);
  const handleDownload = useCallback(() => onDownload(track), [onDownload, track]);
  const handlePlayPause = usePlayPauseToggle({
    isCurrentlyPlaying, isPlayerPlaying, onPlay, onPause, onResume, index,
  });

  const isRepost = activity_type === 'Repost';
  const timeAgo = formatRelativeTime(created_at, t);

  return (
    <TrackRow
      track={track}
      isCurrentlyPlaying={isCurrentlyPlaying}
      isPlayerPlaying={isPlayerPlaying}
      onPlayPause={handlePlayPause}
      artworkUrl={getArtworkUrl(track.artwork_url) ?? null}
      animationDelay={delay}
      className={cn(
        'group border transition-[background-color,border-color] duration-150',
        animate && 'track-row-stagger',
        isSelected
          ? 'bg-primary/5 border-primary/20'
          : isCurrentlyPlaying
            ? 'border-transparent'
            : 'border-transparent hover:bg-muted/50',
      )}
      downloadState={downloadState}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onMouseDown={handleMouseDown}
      leftSlot={
        <div
          className={cn(
            'flex items-center gap-3 shrink-0 self-stretch -my-2 py-2 -ml-3 pl-3',
            isDownloadEnabled && !isDownloaded && 'cursor-pointer',
          )}
          onClick={isDownloadEnabled ? handleToggle : undefined}
        >
          {isDownloadEnabled && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleToggle}
              disabled={isDownloaded}
              className="shrink-0"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          )}
          <span className="w-6 text-right text-xs text-muted-foreground tabular-nums shrink-0">
            {isCurrentlyPlaying ? <EqualizerBars className="h-3 w-3 ml-auto" /> : index + 1}
          </span>
        </div>
      }
      subtitleSlot={
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70 truncate">
          {isRepost ? (
            <>
              <Repeat2 className="h-2.5 w-2.5 text-orange-500 shrink-0" />
              <span className="text-orange-500">{t('newTracks.repost')}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
              <span className="text-emerald-500">{t('newTracks.newTrack')}</span>
            </>
          )}
          <span>&middot;</span>
          <span>{timeAgo}</span>
        </p>
      }
      actionSlot={
        isDownloadEnabled ? (
          <TrackDownloadAction
            state={downloadState}
            onDownload={handleDownload}
            onRetry={handleDownload}
            variant="ghost"
          />
        ) : undefined
      }
    />
  );
});
