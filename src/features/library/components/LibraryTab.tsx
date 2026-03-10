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
import type { LibraryFilter } from '../types';

interface LibraryTabProps {
  onSelectPlaylist: (permalinkUrl: string) => void;
}

export function LibraryTab({ onSelectPlaylist }: LibraryTabProps) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');

  const { playlists, isLoading, error, refetch, clearCache } =
    useLibraryPlaylists(isSignedIn);

  const filtered = useMemo(
    () => filterPlaylists(playlists, searchQuery, filter),
    [playlists, searchQuery, filter],
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const handleRefresh = useCallback(async () => {
    const btn = refreshButtonRef.current;
    if (btn) {
      btn.classList.add('animate-spin');
      setTimeout(() => btn.classList.remove('animate-spin'), 600);
    }
    await clearCache();
    refetch();
  }, [refetch, clearCache]);

  if (!isSignedIn) {
    return <LibraryLockedState />;
  }

  return (
    <div className="space-y-4">
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
        onSelect={onSelectPlaylist}
        onRetry={handleRetry}
      />
    </div>
  );
}
