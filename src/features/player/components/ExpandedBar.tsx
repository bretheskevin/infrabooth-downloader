import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { ListMusic, ChevronDown, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';
import { getArtworkUrl } from '@/lib/soundcloud';
import { usePlayerStore } from '../store';
import { useCurrentTrackInfo } from '../hooks/useCurrentTrackInfo';
import { ScrollingText } from './ScrollingText';
import { SeekBar } from './SeekBar';
import { PreviousButton, PlayPauseButton, NextButton, ShuffleButton } from './TransportButtons';
import { VolumeControl } from './VolumeControl';
import { TrackActionsDropdown } from '@/components/TrackActionsDropdown';
import { useArtistProfileStore } from '@/features/artist-profile';
import { useLikeTrack } from '@/hooks/useLikeTrack';

export const EXPANDED_BAR_HEIGHT = 90;

const actions = () => usePlayerStore.getState();

export function ExpandedBar() {
  const { t } = useTranslation();

  const handleArtistClick = useCallback(() => {
    const track = usePlayerStore.getState().currentTrack;
    if (track && track.artistId > 0) {
      actions().toggleExpanded();
      useArtistProfileStore.getState().openProfile(track.artistId, track.artist);
    }
  }, []);

  const { state, currentTrack, positionMs, durationMs, isQueueOpen } = usePlayerStore(
    useShallow((s) => ({
      state: s.state,
      currentTrack: s.currentTrack,
      positionMs: s.positionMs,
      durationMs: s.durationMs,
      isQueueOpen: s.isQueueOpen,
    })),
  );

  const trackInfo = useCurrentTrackInfo();
  const likeState = useLikeTrack(trackInfo);

  if (!currentTrack || state === 'stopped') return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-[0_-8px_24px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300"
      style={{ height: `${EXPANDED_BAR_HEIGHT}px` }}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="text-[10px] text-muted-foreground min-w-[32px] text-right tabular-nums">{formatDuration(positionMs)}</span>
        <SeekBar waveformUrl={currentTrack.waveformUrl ?? undefined} className="flex-1 h-8" />
        <span className="text-[10px] text-muted-foreground min-w-[32px] tabular-nums">{formatDuration(durationMs)}</span>
      </div>

      <div className="flex items-center gap-3 px-4 pb-3.5 pt-1">
        {/* Artwork + info */}
        <div className="h-8 w-8 rounded-md bg-secondary flex-shrink-0 overflow-hidden">
          {currentTrack.artworkUrl && (
            <img src={getArtworkUrl(currentTrack.artworkUrl) ?? undefined} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <ScrollingText text={currentTrack.title} className="text-xs font-semibold" />
          {(() => {
            const artistContent = (
              <span className="flex items-center gap-1 min-w-0">
                {likeState?.isLiked && <Heart className="h-2.5 w-2.5 flex-shrink-0 fill-primary text-primary" aria-hidden="true" />}
                <span className="truncate">{currentTrack.artist}</span>
              </span>
            );
            return currentTrack.artistId > 0 ? (
              <Button
                variant="link"
                className="text-[10px] text-muted-foreground truncate hover:text-foreground h-auto p-0 block max-w-full text-left"
                onClick={handleArtistClick}
              >
                {artistContent}
              </Button>
            ) : (
              <div className="text-[10px] text-muted-foreground truncate">{artistContent}</div>
            );
          })()}
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <PreviousButton className="h-7 w-7" iconClassName="h-3.5 w-3.5" />
          <PlayPauseButton className="h-8 w-8" iconClassName="h-3.5 w-3.5" />
          <NextButton className="h-7 w-7" iconClassName="h-3.5 w-3.5" />
          <ShuffleButton className="h-7 w-7" iconClassName="h-3.5 w-3.5" />
        </div>

        {/* Volume */}
        <VolumeControl className="ml-2 gap-1.5 [&_button]:h-7 [&_button]:w-7 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_.slider]:w-[60px]" />

        {/* Queue button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', isQueueOpen && 'text-primary bg-primary/10')}
              onClick={() => actions().toggleQueue()}
              aria-label={t('player.queue')}
            >
              <ListMusic className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('player.queue')}</p>
          </TooltipContent>
        </Tooltip>

        <TrackActionsDropdown
          trackId={currentTrack.trackId}
          permalinkUrl={currentTrack.trackUrl}
          triggerClassName="h-7 w-7"
          contentSide="top"
          contentAlign="end"
          likeState={likeState}
          shareInfo={{
            trackId: currentTrack.trackId,
            title: currentTrack.title,
            artist: currentTrack.artist,
            artworkUrl: currentTrack.artworkUrl,
            permalinkUrl: currentTrack.trackUrl,
          }}
        />

        {/* Collapse */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => actions().toggleExpanded()}
          aria-label={t('player.collapse')}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
