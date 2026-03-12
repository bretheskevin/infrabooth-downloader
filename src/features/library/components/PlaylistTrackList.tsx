import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  onDownloadTrack: (track: TrackInfo) => void;
  downloadedIds?: Set<number>;
  onPlayTrack?: (index: number) => void;
  onPauseTrack?: () => void;
  onResumeTrack?: () => void;
  currentlyPlayingId?: number;
  isPlayerPlaying?: boolean;
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
  onDownloadTrack,
  downloadedIds,
  onPlayTrack,
  onPauseTrack,
  onResumeTrack,
  currentlyPlayingId,
  isPlayerPlaying,
}: PlaylistTrackListProps) {
  const { t } = useTranslation();
  const prevCountRef = useRef(0);
  const shouldAnimate = tracks.length > prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = tracks.length;
  }, [tracks.length]);

  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: tracks.length,
    itemHeight: TRACK_ITEM_HEIGHT,
  });

  return (
    <>
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            className="shrink-0"
          />
          <span className="text-xs text-muted-foreground cursor-pointer select-none" onClick={onToggleAll}>
            {t('library.detail.selectAll')}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
                isDownloaded={downloadedIds?.has(track.id) ?? false}
                onToggle={onToggleTrack}
                onDownload={onDownloadTrack}
                onPlay={onPlayTrack}
                onPause={onPauseTrack}
                onResume={onResumeTrack}
                isCurrentlyPlaying={track.id === currentlyPlayingId}
                isPlayerPlaying={isPlayerPlaying}
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
