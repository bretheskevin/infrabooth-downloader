import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';
import type { TrackInfo } from '@/bindings';
import { ApiError } from '@/lib/tauri';
import type { DownloadState } from '@/types/download';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultListProps {
  results: TrackInfo[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  hasSearched: boolean;
  getTrackState: (trackId: number) => DownloadState;
  onDownload: (track: TrackInfo) => void;
  onRetry: (track: TrackInfo) => void;
  onPlayTrack?: (index: number) => void;
  onPauseTrack?: () => void;
  onResumeTrack?: () => void;
  currentlyPlayingId?: number;
  isPlayerPlaying?: boolean;
  onHoverTrack?: (track: TrackInfo) => (() => void) | undefined;
  onMouseDownTrack?: (track: TrackInfo) => void;
}

export function SearchResultList({
  results,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  error,
  hasSearched,
  getTrackState,
  onDownload,
  onRetry,
  onPlayTrack,
  onPauseTrack,
  onResumeTrack,
  currentlyPlayingId,
  isPlayerPlaying,
  onHoverTrack,
  onMouseDownTrack,
}: SearchResultListProps) {
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Empty state — no search yet
  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Search className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t('search.emptyState')}</p>
      </div>
    );
  }

  // Loading initial results
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error
  if (error) {
    const isRateLimited = error instanceof ApiError && error.code === 'RATE_LIMITED';
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">
          {isRateLimited ? t('search.rateLimited') : t('search.errorSearch')}
        </p>
      </div>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t('search.noResults')}</p>
      </div>
    );
  }

  return (
    <div>
      {results.map((track, index) => (
        <SearchResultItem
          key={track.id}
          track={track}
          index={index}
          state={getTrackState(track.id)}
          onDownload={() => onDownload(track)}
          onRetry={() => onRetry(track)}
          onPlay={onPlayTrack}
          onPause={onPauseTrack}
          onResume={onResumeTrack}
          isCurrentlyPlaying={track.id === currentlyPlayingId}
          isPlayerPlaying={isPlayerPlaying}
          onHoverTrack={onHoverTrack}
          onMouseDownTrack={onMouseDownTrack}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-8 flex items-center justify-center">
        {isFetchingNextPage && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
