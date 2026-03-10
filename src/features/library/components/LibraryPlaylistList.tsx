import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { VirtualListContainer, VirtualRow } from '@/components/ui/virtual-list';
import { LibraryPlaylistItem } from './LibraryPlaylistItem';
import type { LibraryPlaylist } from '../types';

interface LibraryPlaylistListProps {
  playlists: LibraryPlaylist[];
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  isFiltered: boolean;
  onSelect: (permalinkUrl: string) => void;
  onRetry: () => void;
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
  onSelect,
}: {
  playlists: LibraryPlaylist[];
  onSelect: (permalinkUrl: string) => void;
}) {
  const { parentRef, virtualItems, totalSize } = useVirtualizedList({
    count: playlists.length,
    itemHeight: PLAYLIST_ITEM_HEIGHT,
  });

  return (
    <VirtualListContainer
      parentRef={parentRef}
      totalSize={totalSize}
      className="max-h-[400px] pr-2"
    >
      {virtualItems.map((virtualItem) => {
        const playlist = playlists[virtualItem.index];
        if (!playlist) return null;
        return (
          <VirtualRow key={playlist.id} virtualItem={virtualItem}>
            <LibraryPlaylistItem
              playlist={playlist}
              onSelect={onSelect}
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
  onSelect,
  onRetry,
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
      onSelect={onSelect}
    />
  );
}
