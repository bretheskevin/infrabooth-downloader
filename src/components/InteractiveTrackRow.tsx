import { createContext, memo, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Checkbox } from '@/components/ui/checkbox';
import { TrackRow } from '@/components/TrackRow';
import { TrackDownloadAction } from '@/components/TrackDownloadAction';
import { EqualizerBars } from '@/features/player/components/EqualizerBars';
import { usePlayerStore } from '@/features/player/store';
import { useDownloadStateStore } from '@/hooks/useDownloadState';
import { toDownloadState } from '@/hooks/useTrackDownload';
import { usePlayPauseToggle } from '@/hooks/usePlayPauseToggle';
import { useHoverPreload } from '@/hooks/useHoverPreload';
import { preloadOnHover, preloadImmediate } from '@/features/player/url-cache';
import { getArtworkUrl } from '@/lib/soundcloud';
import { cn } from '@/lib/utils';
import type { TrackInfo } from '@/bindings';

const MAX_STAGGER_ITEMS = 15;
const STAGGER_DELAY_MS = 25;

const pausePlayer = () => usePlayerStore.getState().pause();
const resumePlayer = () => usePlayerStore.getState().resume();

// --- Context ---

interface TrackListContextValue {
  playTrack: (index: number) => void;
  downloadTrack: (track: TrackInfo) => void;
  isDownloadEnabled: boolean;
  downloadVariant?: 'ghost' | 'filled';
  downloadedIds: Set<number>;
  selection?: {
    selectedIds: Set<number>;
    toggleTrack: (id: number) => void;
  };
  animate?: boolean;
}

const TrackListContext = createContext<TrackListContextValue | null>(null);

function useTrackListContext() {
  const ctx = useContext(TrackListContext);
  if (!ctx) throw new Error('InteractiveTrackRow must be wrapped in TrackListProvider');
  return ctx;
}

interface TrackListProviderProps extends TrackListContextValue {
  children: ReactNode;
}

export function TrackListProvider({
  children,
  playTrack,
  downloadTrack,
  isDownloadEnabled,
  downloadVariant,
  downloadedIds,
  selection,
  animate,
}: TrackListProviderProps) {
  const ctx = useMemo(
    () => ({ playTrack, downloadTrack, isDownloadEnabled, downloadVariant, downloadedIds, selection, animate }),
    [playTrack, downloadTrack, isDownloadEnabled, downloadVariant, downloadedIds, selection?.selectedIds, selection?.toggleTrack, animate],
  );
  return <TrackListContext.Provider value={ctx}>{children}</TrackListContext.Provider>;
}

// --- Component ---

interface InteractiveTrackRowProps {
  track: TrackInfo;
  index: number;
  subtitleSlot?: React.ReactNode;
  onRemoveFromPlaylist?: () => void;
  className?: string;
}

export const InteractiveTrackRow = memo(function InteractiveTrackRow({
  track,
  index,
  subtitleSlot,
  onRemoveFromPlaylist,
  className,
}: InteractiveTrackRowProps) {
  const ctx = useTrackListContext();

  // Player state
  const { currentTrackId, playerState } = usePlayerStore(
    useShallow((s) => ({ currentTrackId: s.currentTrack?.trackId, playerState: s.state })),
  );
  const isCurrentlyPlaying = currentTrackId === track.id;
  const isPlayerPlaying = playerState === 'playing';

  // Download state (merged: in-session store + filesystem scan)
  const rawStoreState = useDownloadStateStore((s) => s.states.get(String(track.id)));
  const downloadState = useMemo(() => {
    const storeState = toDownloadState(rawStoreState);
    if (storeState.status === 'idle' && ctx.downloadedIds.has(track.id)) {
      return { status: 'completed' as const };
    }
    return storeState;
  }, [rawStoreState, ctx.downloadedIds, track.id]);

  // Play/pause/resume
  const handlePlayPause = usePlayPauseToggle({
    isCurrentlyPlaying,
    isPlayerPlaying,
    onPlay: ctx.playTrack,
    onPause: pausePlayer,
    onResume: resumePlayer,
    index,
  });

  // Hover preload (always active)
  const boundHover = useCallback(
    () => preloadOnHover(track.id, track.permalink_url),
    [track.id, track.permalink_url],
  );
  const { onHoverStart, onHoverEnd } = useHoverPreload(boundHover);

  // Mouse-down preload (always active)
  const handleMouseDown = useCallback(
    () => preloadImmediate(track.id, track.permalink_url),
    [track.id, track.permalink_url],
  );

  // Artwork
  const artworkUrl = useMemo(() => getArtworkUrl(track.artwork_url) ?? null, [track.artwork_url]);

  // Download action
  const handleDownload = useCallback(() => ctx.downloadTrack(track), [ctx.downloadTrack, track]);

  // Animation
  const animationDelay = ctx.animate && index < MAX_STAGGER_ITEMS ? index * STAGGER_DELAY_MS : 0;

  // Selection (derived from context)
  const selection = ctx.selection;
  const isSelected = selection ? selection.selectedIds.has(track.id) : false;
  const isDisabled = downloadState.status === 'completed';
  const handleToggle = useCallback(() => {
    selection?.toggleTrack(track.id);
  }, [selection, track.id]);

  // Computed className
  const computedClassName = selection
    ? cn(
        'group border transition-[background-color,border-color] duration-150',
        animationDelay > 0 && 'track-row-stagger',
        isSelected
          ? 'bg-primary/5 border-primary/20'
          : isCurrentlyPlaying
            ? 'border-transparent'
            : 'border-transparent hover:bg-muted/50',
        className,
      )
    : className;

  return (
    <TrackRow
      track={track}
      isCurrentlyPlaying={isCurrentlyPlaying}
      isPlayerPlaying={isPlayerPlaying}
      onPlayPause={handlePlayPause}
      artworkUrl={artworkUrl}
      animationDelay={animationDelay}
      className={computedClassName}
      downloadState={downloadState}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onMouseDown={handleMouseDown}
      subtitleSlot={subtitleSlot}
      onRemoveFromPlaylist={onRemoveFromPlaylist}
      leftSlot={
        selection ? (
          <div
            className={cn(
              'flex items-center gap-3 shrink-0 self-stretch -my-2 py-2 -ml-3 pl-3',
              !isDisabled && 'cursor-pointer',
            )}
            onClick={!isDisabled ? handleToggle : undefined}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleToggle}
              disabled={isDisabled}
              className="shrink-0"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
            <span className="w-6 text-right text-xs text-muted-foreground tabular-nums shrink-0">
              {isCurrentlyPlaying ? <EqualizerBars className="h-3 w-3 ml-auto" /> : index + 1}
            </span>
          </div>
        ) : undefined
      }
      actionSlot={
        ctx.isDownloadEnabled ? (
          <TrackDownloadAction
            state={downloadState}
            onDownload={handleDownload}
            onRetry={handleDownload}
            variant={ctx.downloadVariant ?? 'ghost'}
          />
        ) : undefined
      }
    />
  );
});
