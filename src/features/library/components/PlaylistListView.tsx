import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshButton } from '@/components/ui/refresh-button';
import { api } from '@/lib/tauri';
import { logger } from '@/lib/logger';
import { useLibraryPlaylists } from '../hooks/useLibraryPlaylists';
import { filterPlaylists } from '../utils/filterPlaylists';
import { SearchBar } from '@/components/ui/search-bar';
import { FilterChips } from '@/components/FilterChips';
import { LibraryPlaylistList } from './LibraryPlaylistList';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import type { LibraryFilter } from '../types';
import { libraryActions } from '../store';

interface PlaylistListViewProps {
  searchQuery: string;
  filter: LibraryFilter;
  onOpenDetail: (playlist: LibraryPlaylist) => void;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function PlaylistListView({ searchQuery, filter, onOpenDetail, onDownloadTracks }: PlaylistListViewProps) {
  const { t } = useTranslation();
  const [quickDownloadFailedPlaylist, setQuickDownloadFailedPlaylist] = useState<string | null>(null);
  const [downloadingPlaylistId, setDownloadingPlaylistId] = useState<number | null>(null);
  const [animateRefresh, setAnimateRefresh] = useState(false);

  useEffect(() => {
    if (!quickDownloadFailedPlaylist) return;
    const timer = setTimeout(() => setQuickDownloadFailedPlaylist(null), 4000);
    return () => clearTimeout(timer);
  }, [quickDownloadFailedPlaylist]);

  const { playlists, isLoading, error, refetch, clearCache } = useLibraryPlaylists(true);

  const filtered = useMemo(() => filterPlaylists(playlists, searchQuery, filter), [playlists, searchQuery, filter]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRefresh = useCallback(async () => {
    libraryActions().setLibraryView({ view: 'list' });
    await clearCache();
    await refetch();
    setAnimateRefresh(true);
    requestAnimationFrame(() => {
      setTimeout(() => setAnimateRefresh(false), 300);
    });
  }, [refetch, clearCache]);

  const handleQuickDownload = useCallback(
    async (playlist: LibraryPlaylist) => {
      if (downloadingPlaylistId) return;
      setDownloadingPlaylistId(playlist.id);
      try {
        const tracks = await api.getLibraryPlaylistTracks(playlist.id);
        onDownloadTracks(tracks, playlist.title);
      } catch (err) {
        void logger.error(`[PlaylistListView] Quick download failed: ${err instanceof Error ? err.message : String(err)}`);
        setQuickDownloadFailedPlaylist(playlist.title);
      } finally {
        setDownloadingPlaylistId(null);
      }
    },
    [onDownloadTracks, downloadingPlaylistId],
  );

  return (
    <>
      <SearchBar
        value={searchQuery}
        onChange={(v) => libraryActions().setSearchQuery(v)}
        placeholder={t('library.searchPlaceholder')}
        autoFocus
      />
      <div className="flex items-center justify-between">
        <FilterChips<LibraryFilter>
          options={[
            { key: 'all', label: 'library.filterAll' },
            { key: 'mine', label: 'library.filterMine' },
            { key: 'liked', label: 'library.filterLiked' },
          ]}
          active={filter}
          onChange={(f) => libraryActions().setFilter(f)}
        />
        <RefreshButton
          onRefresh={handleRefresh}
          aria-label={t('library.refresh')}
          className="h-8 w-8 text-muted-foreground"
          iconClassName="h-3.5 w-3.5"
        />
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
        onOpenDetail={onOpenDetail}
        onDownload={handleQuickDownload}
        downloadingPlaylistId={downloadingPlaylistId}
        onRetry={handleRetry}
        animateRefresh={animateRefresh}
      />
    </>
  );
}
