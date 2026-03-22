import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { Pause, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getArtworkUrl } from '@/lib/soundcloud';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePlayerStore } from '../store';
import { ScrollingText } from './ScrollingText';

const actions = () => usePlayerStore.getState();

export function MiniPill() {
  const { t } = useTranslation();
  const { state, currentTrack, positionMs, durationMs } = usePlayerStore(
    useShallow((s) => ({
      state: s.state,
      currentTrack: s.currentTrack,
      positionMs: s.positionMs,
      durationMs: s.durationMs,
    }))
  );

  const [canInteract, setCanInteract] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setCanInteract(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!currentTrack || state === 'stopped') return null;

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const circumference = 2 * Math.PI * 16; // radius 16
  const strokeDashoffset = circumference * (1 - progress);
  const isLoading = state === 'loading';
  const isPlaying = state === 'playing';

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-40 flex items-center h-12 rounded-full bg-primary shadow-lg shadow-primary/25',
        'animate-in fade-in zoom-in-95 duration-200',
      )}
    >
      {/* Left: artwork + info (click to expand) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 pl-1.5 pr-3 h-full rounded-l-full transition-colors',
              canInteract ? 'hover:bg-white/10' : 'opacity-70',
            )}
            onClick={() => actions().toggleExpanded()}
            disabled={!canInteract}
            aria-label={t('player.expand')}
          >
            <div className="relative h-9 w-9 flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-primary-foreground/20 overflow-hidden">
                {currentTrack.artworkUrl && (
                  <img
                    src={getArtworkUrl(currentTrack.artworkUrl) ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              {/* Progress ring */}
              <svg className="absolute inset-0 -rotate-90" width="36" height="36" aria-hidden="true">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                {isLoading ? (
                  <circle
                    cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="2"
                    strokeDasharray={circumference} strokeDashoffset={circumference * 0.75}
                    strokeLinecap="round"
                    className="animate-spin origin-center"
                  />
                ) : (
                  <circle
                    cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="2"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-300"
                  />
                )}
              </svg>
            </div>
            <div className="max-w-[70px]">
              <ScrollingText
                text={currentTrack.title}
                className="text-[10px] font-semibold text-primary-foreground"
              />
              <div className="text-[9px] text-primary-foreground/65 truncate">
                {currentTrack.artist}
              </div>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('player.clickToExpand')}</TooltipContent>
      </Tooltip>

      {/* Right: play/pause (click to toggle) */}
      <button
        className={cn(
          'flex items-center justify-center h-full px-3 rounded-r-full transition-colors border-l border-white/15',
          canInteract ? 'hover:bg-white/10' : 'opacity-70',
        )}
        onClick={() => (isPlaying ? actions().pause() : actions().resume())}
        disabled={!canInteract}
        aria-label={isPlaying ? t('player.pause') : t('player.play')}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 text-primary-foreground fill-primary-foreground" />
        ) : (
          <Play className="h-4 w-4 text-primary-foreground fill-primary-foreground" />
        )}
      </button>
    </div>
  );
}
