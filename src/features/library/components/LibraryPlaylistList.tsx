import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { useIsWidescreen } from '@/hooks/useIsWidescreen';
import { LibraryPlaylistItem } from './LibraryPlaylistItem';
import { useLibraryStore } from '../store';
import type { LibraryPlaylist } from '@/bindings';

interface LibraryPlaylistListProps {
  playlists: LibraryPlaylist[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  isFiltered: boolean;
  onOpenDetail: (playlist: LibraryPlaylist) => void;
  onDownload: (playlist: LibraryPlaylist) => void;
  downloadingPlaylistId: number | null;
  onRetry: () => void;
  animateRefresh?: boolean;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-2.5">
      <Skeleton className="w-12 h-12 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

const PLAYLIST_ITEM_HEIGHT = 68;

function ScrollablePlaylistList({
  playlists,
  onOpenDetail,
  onDownload,
  downloadingPlaylistId,
  animateRefresh,
}: {
  playlists: LibraryPlaylist[];
  onOpenDetail: (playlist: LibraryPlaylist) => void;
  onDownload: (playlist: LibraryPlaylist) => void;
  downloadingPlaylistId: number | null;
  animateRefresh: boolean;
}) {
  const isWidescreen = useIsWidescreen();
  const { parentRef, virtualItems, totalSize, getScrollOffset } = useVirtualizedList({
    count: playlists.length,
    itemHeight: PLAYLIST_ITEM_HEIGHT,
    initialScrollOffset: useLibraryStore.getState().listScrollTop,
  });

  useEffect(() => {
    return () => { useLibraryStore.getState().setListScrollTop(getScrollOffset()); };
  }, [getScrollOffset]);

  if (isWidescreen) {
    return (
      <div
        data-testid="widescreen-grid"
        className={`grid grid-cols-[repeat(auto-fill,minmax(420px,1fr))] gap-1 flex-1 min-h-0 overflow-y-auto pr-2${animateRefresh ? ' library-list-refresh' : ''}`}
      >
        {playlists.map((playlist) => (
          <LibraryPlaylistItem
            key={playlist.id}
            playlist={playlist}
            onOpenDetail={() => onOpenDetail(playlist)}
            onDownload={() => onDownload(playlist)}
            isDownloading={downloadingPlaylistId === playlist.id}
          />
        ))}
      </div>
    );
  }

  return (
    <VirtualListContainer
      parentRef={parentRef}
      totalSize={totalSize}
      className={`flex-1 min-h-0 pr-2${animateRefresh ? ' library-list-refresh' : ''}`}
    >
      {virtualItems.map((virtualItem) => {
        const playlist = playlists[virtualItem.index];
        if (!playlist) return null;
        return (
          <VirtualRow key={playlist.id} size={virtualItem.size} start={virtualItem.start}>
            <LibraryPlaylistItem
              playlist={playlist}
              onOpenDetail={() => onOpenDetail(playlist)}
              onDownload={() => onDownload(playlist)}
              isDownloading={downloadingPlaylistId === playlist.id}
            />
          </VirtualRow>
        );
      })}
    </VirtualListContainer>
  );
}

export function LibraryPlaylistList({
  playlists,
  isLoading,
  error,
  isEmpty,
  isFiltered,
  onOpenDetail,
  onDownload,
  downloadingPlaylistId,
  onRetry,
  animateRefresh = false,
}: LibraryPlaylistListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-1" data-testid="library-skeleton">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    const message = error.message?.includes('Authentication required')
      ? t('library.lockedTitle')
      : error.message?.includes('Rate limited')
        ? t('library.rateLimited')
        : t('library.errorRetry');

    return (
      <Button
        variant="ghost"
        onClick={onRetry}
        className="w-full py-8 text-sm text-muted-foreground"
      >
        {message}
      </Button>
    );
  }

  if (isEmpty) {
    return (
      <p className="text-center py-8 text-sm text-muted-foreground">
        {isFiltered ? t('library.noResults') : t('library.emptyState')}
      </p>
    );
  }

  return (
    <ScrollablePlaylistList
      playlists={playlists}
      onOpenDetail={onOpenDetail}
      onDownload={onDownload}
      downloadingPlaylistId={downloadingPlaylistId}
      animateRefresh={animateRefresh}
    />
  );
}
