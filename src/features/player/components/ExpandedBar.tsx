import { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatDuration, getArtworkUrl } from '@/lib/utils';
import { usePlayerStore } from '../store';
import { ScrollingText } from './ScrollingText';

export const EXPANDED_BAR_HEIGHT = 76;
/** Gap between the expanded bar top and floating elements above it. */
export const EXPANDED_BAR_GAP = 8;

export function ExpandedBar() {
  const { t } = useTranslation();
  const state = usePlayerStore((s) => s.state);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const volume = usePlayerStore((s) => s.volume);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const seek = usePlayerStore((s) => s.seek);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleExpanded = usePlayerStore((s) => s.toggleExpanded);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);

  const seekbarRef = useRef<HTMLDivElement>(null);
  const [seekHover, setSeekHover] = useState<{ x: number; timeMs: number } | null>(null);

  const onSeekbarMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const bar = seekbarRef.current;
      if (!bar || !durationMs) return;
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSeekHover({ x, timeMs: Math.round((x / rect.width) * durationMs) });
    },
    [durationMs],
  );

  const onSeekbarMouseLeave = useCallback(() => setSeekHover(null), []);

  if (!currentTrack || state === 'stopped') return null;

  const isPlaying = state === 'playing';
  const isLoading = state === 'loading';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-lg animate-in slide-in-from-bottom duration-300" style={{ height: `${EXPANDED_BAR_HEIGHT}px` }}>
      {/* Seekbar */}
      <div className="flex items-center gap-2 px-4 pt-2">
        <span className="text-[10px] text-muted-foreground min-w-[32px] text-right tabular-nums">
          {formatDuration(positionMs)}
        </span>
        <div
          ref={seekbarRef}
          className="relative flex-1"
          onMouseMove={onSeekbarMouseMove}
          onMouseLeave={onSeekbarMouseLeave}
        >
          <Slider
            value={[positionMs]}
            max={durationMs || 1}
            step={1000}
            onValueChange={([v]) => seek(v ?? 0)}
          />
          {seekHover && (
            <div
              className="absolute bottom-full mb-1.5 -translate-x-1/2 pointer-events-none rounded-md bg-primary px-2 py-0.5 text-[10px] text-primary-foreground tabular-nums shadow-sm"
              style={{ left: seekHover.x }}
            >
              {formatDuration(seekHover.timeMs)}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground min-w-[32px] tabular-nums">
          {formatDuration(durationMs)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 px-4 pb-2.5 pt-1">
        {/* Artwork + info */}
        <div className="h-8 w-8 rounded-md bg-secondary flex-shrink-0 overflow-hidden">
          {currentTrack.artworkUrl && (
            <img
              src={getArtworkUrl(currentTrack.artworkUrl) ?? undefined}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <ScrollingText text={currentTrack.title} className="text-xs font-semibold" />
          <div className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={previous} aria-label={t('player.previous')}>
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => isPlaying ? pause() : resume()}
            aria-label={isPlaying ? t('player.pause') : t('player.play')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next} aria-label={t('player.next')}>
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5 ml-2">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => setVolume((v ?? 0) / 100)}
            className="w-[60px]"
          />
        </div>

        {/* Queue button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', isQueueOpen && 'text-primary bg-primary/10')}
              onClick={toggleQueue}
              aria-label={t('player.queue')}
            >
              <ListMusic className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('player.queue')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Collapse */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleExpanded} aria-label={t('player.collapse')}>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
