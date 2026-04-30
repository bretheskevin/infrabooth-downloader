import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { Heart, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';
import { getArtworkUrl } from '@/lib/soundcloud';
import { usePlayerStore } from '../store';
import { useCurrentTrackInfo } from '../hooks/useCurrentTrackInfo';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { PreviousButton, PlayPauseButton, NextButton, ShuffleButton } from './TransportButtons';
import { ScrollingText } from './ScrollingText';
import { SeekBar } from './SeekBar';
import { TrackActionsDropdown } from '@/components/TrackActionsDropdown';
import { ArtistLink } from '@/components/ArtistLink';
import { useLikeTrack } from '@/hooks/useLikeTrack';

export function RailNowPlaying() {
  const { t } = useTranslation();

  const { state, currentTrack, positionMs, durationMs, volume } = usePlayerStore(
    useShallow((s) => ({
      state: s.state,
      currentTrack: s.currentTrack,
      positionMs: s.positionMs,
      durationMs: s.durationMs,
      volume: s.volume,
    }))
  );

  const trackInfo = useCurrentTrackInfo();
  const likeState = useLikeTrack(trackInfo);

  if (!currentTrack || state === 'stopped') return null;

  const shareInfo = {
    trackId: currentTrack.trackId, title: currentTrack.title,
    artist: currentTrack.artist, artworkUrl: currentTrack.artworkUrl,
    permalinkUrl: currentTrack.trackUrl,
  };

  return (
    <div className="px-4 pb-3 border-b border-border space-y-3">
      <div className="flex items-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('player.nowPlaying')}
        </span>
      </div>

      <div className="w-full aspect-square rounded-xl overflow-hidden shadow-lg bg-secondary">
        {currentTrack.artworkUrl && (
          <img src={getArtworkUrl(currentTrack.artworkUrl, 500) ?? undefined} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div>
        <ScrollingText text={currentTrack.title} className="text-[15px] font-semibold" />
        <div className="flex items-center gap-1.5 mt-0.5">
          {likeState?.isLiked && (
            <Heart className="h-3 w-3 flex-shrink-0 fill-primary text-primary" aria-hidden="true" />
          )}
          <ArtistLink userId={currentTrack.artistId} username={currentTrack.artist} className="text-xs text-muted-foreground truncate" />
        </div>
      </div>

      <SeekBar waveformUrl={currentTrack.waveformUrl ?? undefined} className="h-10" />

      <div className="flex justify-between text-xs text-muted-foreground tabular-nums font-mono -mt-1">
        <span>{formatDuration(positionMs)}</span>
        <span>{formatDuration(durationMs)}</span>
      </div>

      <div className="flex items-center justify-between !mt-0.5">
        <TrackActionsDropdown
          trackId={currentTrack.trackId} permalinkUrl={currentTrack.trackUrl}
          triggerClassName="h-8 w-8" contentSide="top" contentAlign="start"
          shareInfo={shareInfo}
        />
        <ShuffleButton className="h-8 w-8" iconClassName="h-3.5 w-3.5" />
        <PreviousButton className="h-8 w-8" iconClassName="h-3.5 w-3.5" />
        <PlayPauseButton className="h-11 w-11 shadow-[0_0_16px_rgba(var(--primary-rgb),0.3)]" />
        <NextButton className="h-8 w-8" iconClassName="h-3.5 w-3.5" />
        <Button variant="ghost" size="icon" className={cn('h-8 w-8', likeState?.isLiked && 'text-primary')}
          onClick={() => likeState?.onToggle()} disabled={!likeState} aria-label={t('player.like')}>
          <Heart className={cn('h-3.5 w-3.5', likeState?.isLiked && 'fill-primary')} />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('player.volume')}>
              {volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-10 h-36 p-0 flex items-center justify-center">
            <Slider
              aria-label={t('player.volume')}
              value={[volume]}
              max={1}
              step={0.01}
              orientation="vertical"
              onValueChange={([v]) => v !== undefined && usePlayerStore.getState().setVolume(v)}
              className="h-28"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
