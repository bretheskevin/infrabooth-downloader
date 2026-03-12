import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, Music } from 'lucide-react';
import { PlayOverlay } from '@/features/player';
import { cn, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrackInfo } from '@/bindings';

interface PlaylistTrackItemProps {
  track: TrackInfo;
  index: number;
  staggerIndex: number;
  animate?: boolean;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onDownload: (track: TrackInfo) => void;
  isDownloaded?: boolean;
  onPlay?: (index: number) => void;
  onPause?: () => void;
  isCurrentlyPlaying?: boolean;
}

const MAX_STAGGER_ITEMS = 15;
const STAGGER_DELAY_MS = 25;

export const PlaylistTrackItem = memo(function PlaylistTrackItem({
  track,
  index,
  staggerIndex,
  animate = true,
  isSelected,
  onToggle,
  onDownload,
  isDownloaded = false,
  onPlay,
  onPause,
  isCurrentlyPlaying = false,
}: PlaylistTrackItemProps) {
  const { t } = useTranslation();
  const delay = animate && staggerIndex < MAX_STAGGER_ITEMS ? staggerIndex * STAGGER_DELAY_MS : 0;
  const artworkUrl = track.artwork_url ?? null;

  const handleToggle = useCallback(() => onToggle(track.id), [onToggle, track.id]);
  const handleDownload = useCallback(() => onDownload(track), [onDownload, track]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md border transition-[background-color,border-color] duration-150',
        animate && 'track-row-stagger',
        isDownloaded && 'opacity-60',
        isSelected
          ? 'bg-primary/5 border-primary/20'
          : isCurrentlyPlaying
            ? 'bg-primary/5 border-transparent'
            : 'border-transparent hover:bg-muted/50',
      )}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleToggle}
        disabled={isDownloaded}
        className="shrink-0"
      />
      <span className="w-6 text-right text-xs text-muted-foreground tabular-nums shrink-0">
        {isCurrentlyPlaying ? <Music className="h-3 w-3 text-primary" /> : index + 1}
      </span>
      <PlayOverlay
        onPlay={() => onPlay?.(index)}
        onPause={onPause}
        isPlaying={isCurrentlyPlaying}
        className="w-8 h-8 shrink-0"
      >
        <div className="w-8 h-8 rounded bg-muted overflow-hidden">
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
      </PlayOverlay>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.user.username}</p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {formatDuration(track.duration)}
      </span>
      {isDownloaded ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="h-7 w-7 shrink-0 flex items-center justify-center text-green-500"
              aria-label={t('library.detail.alreadyDownloaded')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t('library.detail.alreadyDownloaded')}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleDownload}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
});
