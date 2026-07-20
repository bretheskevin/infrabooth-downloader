import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Play, Pause, ListPlus, Download, Loader2, Check } from 'lucide-react';
import type { RemoteTrack, RemoteState } from '@/lib/remote-protocol';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getArtworkUrl } from '@/lib/soundcloud';
import { t } from '@remote/lib/i18n';
import { TrackRowCore } from '@/components/TrackRowCore';
import { TrackRowMenu } from '@remote/components/TrackRowMenu';

const SWIPE_THRESHOLD = 80;
const MOVE_TOLERANCE = 6;

interface Props {
  track: RemoteTrack;
  state: RemoteState | null;
  language: string;
  onPlay: () => void;
  onQueue: () => void;
  onDownload: () => void;
}

export default function TrackRow({ track, state, language, onPlay, onQueue, onDownload }: Props) {
  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const artworkUrl = getArtworkUrl(track.artworkUrl, 50);
  const isCurrent = state?.currentTrack?.trackId === track.trackId;
  const isPlaying = isCurrent && state?.state === 'playing';
  const isDownloading = state?.downloadingTrackIds.includes(track.trackId) ?? false;
  const isDownloaded = state?.downloadedTrackIds.includes(track.trackId) ?? false;
  const swipeActive = Math.abs(swipeX) >= SWIPE_THRESHOLD;

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    movedRef.current = false;
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > MOVE_TOLERANCE) movedRef.current = true;
    setSwipeX(dx);
  }

  function resetSwipe() {
    setSwipeX(0);
    startXRef.current = null;
  }

  function handlePointerUp() {
    if (startXRef.current === null) return;
    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) onQueue();
    resetSwipe();
  }

  function handleClick() {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    onPlay();
  }

  return (
    <li className="relative overflow-hidden">
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-between px-5 transition-colors',
          swipeActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
        )}
      >
        <ListPlus className={cn('size-5', swipeX <= 0 && 'invisible')} />
        <ListPlus className={cn('size-5', swipeX >= 0 && 'invisible')} />
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetSwipe}
        onClick={handleClick}
        style={{ transform: `translateX(${swipeX}px)` }}
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 cursor-pointer bg-card touch-pan-y',
          swipeX === 0 && 'transition-transform',
        )}
      >
        <div className={cn('relative w-10 h-10 flex-shrink-0 rounded overflow-hidden', isCurrent && 'ring-2 ring-primary')}>
          {artworkUrl ? (
            <img src={artworkUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
          {isCurrent && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              {isPlaying ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
            </div>
          )}
        </div>
        <TrackRowCore title={track.title} artist={track.artist} isCurrent={isCurrent} />
        <div className="flex flex-shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('download', language)}
            disabled={isDownloading || isDownloaded}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className={cn('h-11 w-9', isDownloaded ? 'text-success' : 'text-muted-foreground')}
          >
            {isDownloading ? <Loader2 className="animate-spin text-primary" /> : isDownloaded ? <Check /> : <Download />}
          </Button>
          <TrackRowMenu language={language} onQueue={onQueue} />
        </div>
      </div>
    </li>
  );
}
