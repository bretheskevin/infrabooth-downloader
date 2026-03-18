import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DownloadState } from '@/types/download';
import { useIsDownloadEnabled } from '@/features/settings';
import { useLibraryStore } from '../store';
import { SORT_MODES, type SortMode } from '../types';
import { PlaylistTrackItem } from './PlaylistTrackItem';

const TRACK_ITEM_HEIGHT = 56;

interface PlaylistTrackListProps {
  tracks: TrackInfo[];
  isStreaming?: boolean;
  selectedIds: Set<number>;
  isAllSelected: boolean;
  sortMode?: SortMode;
  onSortChange?: (mode: SortMode) => void;
  onToggleTrack: (id: number) => void;
  onToggleAll: () => void;
  getTrackState: (trackId: number) => DownloadState;
  onDownloadTrack: (track: TrackInfo) => void;
  onPlayTrack?: (index: number) => void;
  onPauseTrack?: () => void;
  onResumeTrack?: () => void;
  currentlyPlayingId?: number;
  isPlayerPlaying?: boolean;
  onHoverTrack?: (track: TrackInfo) => (() => void) | undefined;
  onMouseDownTrack?: (track: TrackInfo) => void;
  hasSelectableTracks?: boolean;
}

export function PlaylistTrackList({
  tracks,
  isStreaming,
  selectedIds,
  isAllSelected,
  sortMode,
  onSortChange,
  onToggleTrack,
  onToggleAll,
  getTrackState,
  onDownloadTrack,
  onPlayTrack,
  onPauseTrack,
  onResumeTrack,
  currentlyPlayingId,
  isPlayerPlaying,
  onHoverTrack,
  onMouseDownTrack,
  hasSelectableTracks = true,
}: PlaylistTrackListProps) {
  const { t } = useTranslation();
  const isDownloadEnabled = useIsDownloadEnabled();
  const prevCountRef = useRef(0);
  const shouldAnimate = tracks.length > prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = tracks.length;
  }, [tracks.length]);

  const { parentRef, virtualItems, totalSize, getScrollOffset } = useVirtualizedList({
    count: tracks.length,
    itemHeight: TRACK_ITEM_HEIGHT,
    initialScrollOffset: useLibraryStore.getState().detailScrollTop,
  });

  useEffect(() => {
    return () => { useLibraryStore.getState().setDetailScrollTop(getScrollOffset()); };
  }, [getScrollOffset]);

  return (
    <>
      <div className="flex items-center justify-between px-3">
        {isDownloadEnabled && hasSelectableTracks && (
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={onToggleAll}
              className="shrink-0"
            />
            <span className="text-xs text-muted-foreground cursor-pointer select-none" onClick={onToggleAll}>
              {t(isAllSelected ? 'library.detail.deselectAll' : 'library.detail.selectAll')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onSortChange && sortMode && (
            <Select value={sortMode} onValueChange={(v) => {
              if (SORT_MODES.includes(v as SortMode)) onSortChange(v as SortMode);
            }}>
              <SelectTrigger className="h-7 text-xs w-auto gap-1.5 px-2">
                <ArrowUpDown className="h-3 w-3 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t('library.detail.sortDefault')}</SelectItem>
                <SelectItem value="title-asc">{t('library.detail.sortTitleAsc')}</SelectItem>
                <SelectItem value="title-desc">{t('library.detail.sortTitleDesc')}</SelectItem>
                <SelectItem value="artist-asc">{t('library.detail.sortArtistAsc')}</SelectItem>
                <SelectItem value="artist-desc">{t('library.detail.sortArtistDesc')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <VirtualListContainer
        parentRef={parentRef}
        totalSize={totalSize}
        className="flex-1 min-h-0 pr-2"
      >
        {virtualItems.map((virtualItem) => {
          const track = tracks[virtualItem.index];
          if (!track) return null;
          return (
            <VirtualRow key={track.id} size={virtualItem.size} start={virtualItem.start}>
              <PlaylistTrackItem
                track={track}
                index={virtualItem.index}
                staggerIndex={virtualItem.index}
                animate={shouldAnimate}
                isSelected={selectedIds.has(track.id)}
                onToggle={onToggleTrack}
                downloadState={getTrackState(track.id)}
                onDownload={onDownloadTrack}
                onPlay={onPlayTrack}
                onPause={onPauseTrack}
                onResume={onResumeTrack}
                isCurrentlyPlaying={track.id === currentlyPlayingId}
                isPlayerPlaying={isPlayerPlaying}
                onHoverTrack={onHoverTrack}
                onMouseDownTrack={onMouseDownTrack}
                isDownloadEnabled={isDownloadEnabled}
              />
            </VirtualRow>
          );
        })}
      </VirtualListContainer>
      {isStreaming && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t('library.detail.loadingTracks')}</span>
        </div>
      )}
    </>
  );
}
