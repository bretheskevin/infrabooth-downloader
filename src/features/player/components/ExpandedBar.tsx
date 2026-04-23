import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { ListMusic, ChevronDown, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';
import { getArtworkUrl } from '@/lib/soundcloud';
import { useOpenDownloadFolder } from '@/hooks/useOpenDownloadFolder';
import { usePlayerStore } from '../store';
import { useDownloadStateStore } from '@/hooks/useDownloadState';
import { ScrollingText } from './ScrollingText';
import { SeekBar } from './SeekBar';
import { TransportControls } from './TransportControls';
import { VolumeControl } from './VolumeControl';
import { TrackActionsDropdown } from '@/components/TrackActionsDropdown';
import { useArtistProfileStore } from '@/features/artist-profile';
import { useLikeTrack } from '@/hooks/useLikeTrack';
import type { TrackInfo } from '@/bindings';

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
    }))
  );

  const trackInfo = useMemo(() => {
    if (!currentTrack) return undefined;
    return {
      id: currentTrack.trackId,
      title: currentTrack.title,
      user: { id: currentTrack.artistId, username: currentTrack.artist, avatar_url: null },
      artwork_url: currentTrack.artworkUrl,
      duration: currentTrack.durationMs,
      permalink_url: currentTrack.trackUrl,
      waveform_url: currentTrack.waveformUrl,
      downloadable: false,
      download_url: null,
    } satisfies TrackInfo;
  }, [currentTrack]);

  const likeState = useLikeTrack(trackInfo);

  const filePath = useDownloadStateStore((s) => s.states.get(String(currentTrack?.trackId ?? ''))?.filePath);
  const handleOpenFileLocation = useOpenDownloadFolder(filePath ?? null);

  if (!currentTrack || state === 'stopped') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-[0_-8px_24px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300" style={{ height: `${EXPANDED_BAR_HEIGHT}px` }}>
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="text-[10px] text-muted-foreground min-w-[32px] text-right tabular-nums">
          {formatDuration(positionMs)}
        </span>
        <SeekBar waveformUrl={currentTrack.waveformUrl ?? undefined} className="flex-1 h-8" />
        <span className="text-[10px] text-muted-foreground min-w-[32px] tabular-nums">
          {formatDuration(durationMs)}
        </span>
      </div>

      <div className="flex items-center gap-3 px-4 pb-3.5 pt-1">
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
        <TransportControls className="gap-1 [&_button]:h-7 [&_button]:w-7 [&_button.rounded-full]:h-8 [&_button.rounded-full]:w-8 [&_svg]:h-3.5 [&_svg]:w-3.5" />

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
          onOpenFileLocation={filePath ? handleOpenFileLocation : undefined}
          likeState={likeState}
          shareInfo={{ trackId: currentTrack.trackId, title: currentTrack.title, artist: currentTrack.artist, artworkUrl: currentTrack.artworkUrl, permalinkUrl: currentTrack.trackUrl }}
        />

        {/* Collapse */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => actions().toggleExpanded()} aria-label={t('player.collapse')}>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
