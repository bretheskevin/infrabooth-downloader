import { useState, useMemo, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { useLibraryPlaylists } from '../hooks/useLibraryPlaylists';
import { filterPlaylists } from '../utils/filterPlaylists';
import { LibrarySearchBar } from './LibrarySearchBar';
import { LibraryFilterChips } from './LibraryFilterChips';
import { LibraryPlaylistList } from './LibraryPlaylistList';
import { LibraryLockedState } from './LibraryLockedState';
import { PlaylistDetailView } from './PlaylistDetailView';
import type { LibraryFilter, LibraryView } from '../types';

interface LibraryTabProps {
  onSelectPlaylist: (permalinkUrl: string) => void;
}

export function LibraryTab({ onSelectPlaylist: _onSelectPlaylist }: LibraryTabProps) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [libraryView, setLibraryView] = useState<LibraryView>({ view: 'list' });
  const [slideClass, setSlideClass] = useState('');

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

  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const handleRefresh = useCallback(async () => {
    setLibraryView({ view: 'list' });
    const btn = refreshButtonRef.current;
    if (btn) {
      btn.classList.add('animate-spin');
      setTimeout(() => btn.classList.remove('animate-spin'), 600);
    }
    await clearCache();
    refetch();
  }, [refetch, clearCache]);

  const handlePlaylistClick = useCallback(
    (permalinkUrl: string) => {
      const playlist = playlists.find((p) => p.permalink_url === permalinkUrl);
      if (playlist) {
        setSlideClass('library-slide-in-detail');
        setLibraryView({ view: 'detail', playlist });
      }
    },
    [playlists],
  );

  if (!isSignedIn) {
    return <LibraryLockedState />;
  }

  if (libraryView.view === 'detail') {
    return (
      <div key="detail" className={slideClass}>
        <PlaylistDetailView
          playlist={libraryView.playlist}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div key="list" className={`space-y-4 ${slideClass}`}>
      <LibrarySearchBar value={searchQuery} onChange={setSearchQuery} />
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
      <LibraryPlaylistList
        playlists={filtered}
        isLoading={isLoading}
        error={error}
        isEmpty={filtered.length === 0 && !isLoading}
        isFiltered={searchQuery.trim() !== '' || filter !== 'all'}
        onSelect={handlePlaylistClick}
        onRetry={handleRetry}
      />
    </div>
  );
}
