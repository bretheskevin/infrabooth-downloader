import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/features/auth/store';
import { useLibraryPlaylists } from '../hooks/useLibraryPlaylists';
import { filterPlaylists } from '../utils/filterPlaylists';
import { SearchBar } from '@/components/ui/search-bar';
import { LibraryFilterChips } from './LibraryFilterChips';
import { LibraryPlaylistList } from './LibraryPlaylistList';
import { LibraryLockedState } from './LibraryLockedState';
import { PlaylistDetailView } from './PlaylistDetailView';
import type { TrackInfo } from '@/bindings';
import type { LibraryFilter, LibraryPlaylist, LibraryView } from '../types';

interface LibraryTabProps {
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function LibraryTab({ onDownloadTracks }: LibraryTabProps) {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [libraryView, setLibraryView] = useState<LibraryView>({ view: 'list' });
  const [slideClass, setSlideClass] = useState('');
  const [quickDownloadFailedPlaylist, setQuickDownloadFailedPlaylist] = useState<string | null>(null);
  const [downloadingPlaylistId, setDownloadingPlaylistId] = useState<number | null>(null);

  useEffect(() => {
    if (!quickDownloadFailedPlaylist) return;
    const timer = setTimeout(() => setQuickDownloadFailedPlaylist(null), 4000);
    return () => clearTimeout(timer);
  }, [quickDownloadFailedPlaylist]);

  const { playlists, isLoading, error, refetch, clearCache } =
    useLibraryPlaylists(isSignedIn);

  const filtered = useMemo(
    () => filterPlaylists(playlists, searchQuery, filter),
    [playlists, searchQuery, filter],
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleBackToList = useCallback(() => {
    setSlideClass('library-slide-in-list');
    setLibraryView({ view: 'list' });
  }, []);

  const [animateRefresh, setAnimateRefresh] = useState(false);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const handleRefresh = useCallback(async () => {
    setLibraryView({ view: 'list' });
    const btn = refreshButtonRef.current;
    if (btn) btn.classList.add('animate-spin');
    await clearCache();
    await refetch();
    if (btn) btn.classList.remove('animate-spin');
    setAnimateRefresh(true);
    requestAnimationFrame(() => {
      setTimeout(() => setAnimateRefresh(false), 300);
    });
  }, [refetch, clearCache]);

  const handleOpenDetail = useCallback(
    (playlist: LibraryPlaylist) => {
      setSlideClass('library-slide-in-detail');
      setLibraryView({ view: 'detail', playlist });
    },
    [],
  );

  const handleQuickDownload = useCallback(
    async (playlist: LibraryPlaylist) => {
      if (downloadingPlaylistId) return;
      setDownloadingPlaylistId(playlist.id);
      try {
        const tracks = await api.getLibraryPlaylistTracks(playlist.id);
        onDownloadTracks(tracks, playlist.title);
      } catch (err) {
        void logger.error(`[LibraryTab] Quick download failed: ${err instanceof Error ? err.message : String(err)}`);
        setQuickDownloadFailedPlaylist(playlist.title);
      } finally {
        setDownloadingPlaylistId(null);
      }
    },
    [onDownloadTracks, downloadingPlaylistId],
  );

  if (!isSignedIn) {
    return <LibraryLockedState />;
  }

  if (libraryView.view === 'detail') {
    return (
      <div key="detail" className={`flex-1 min-h-0 flex flex-col ${slideClass}`}>
        <PlaylistDetailView
          playlist={libraryView.playlist}
          onBack={handleBackToList}
          onDownloadTracks={onDownloadTracks}
        />
      </div>
    );
  }

  return (
    <div key="list" className={`flex flex-col gap-4 flex-1 min-h-0 ${slideClass}`}>
      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={t('library.searchPlaceholder')} autoFocus />
      <div className="flex items-center justify-between">
        <LibraryFilterChips active={filter} onChange={setFilter} />
        <Button
          ref={refreshButtonRef}
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-8 w-8 text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      {quickDownloadFailedPlaylist && (
        <p className="text-sm text-destructive px-1">
          {t('library.detail.quickDownloadFailed')} — {quickDownloadFailedPlaylist}
        </p>
      )}
      <LibraryPlaylistList
        playlists={filtered}
        isLoading={isLoading}
        error={error}
        isEmpty={filtered.length === 0 && !isLoading}
        isFiltered={searchQuery.trim() !== '' || filter !== 'all'}
        onOpenDetail={handleOpenDetail}
        onDownload={handleQuickDownload}
        downloadingPlaylistId={downloadingPlaylistId}
        onRetry={handleRetry}
        animateRefresh={animateRefresh}
      />
    </div>
  );
}
