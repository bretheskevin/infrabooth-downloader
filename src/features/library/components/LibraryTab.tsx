import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/features/auth/store';
import { LibraryLockedState } from './LibraryLockedState';
import { PlaylistDetailView } from './PlaylistDetailView';
import { PlaylistListView } from './PlaylistListView';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { useLibraryStore } from '../store';

const libraryActions = () => useLibraryStore.getState();

interface LibraryTabProps {
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function LibraryTab({ onDownloadTracks }: LibraryTabProps) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const { searchQuery, filter, libraryView } = useLibraryStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      filter: s.filter,
      libraryView: s.libraryView,
    }))
  );
  const [slideClass, setSlideClass] = useState('');

  const handleBackToList = useCallback(() => {
    setSlideClass('library-slide-in-list');
    libraryActions().setLibraryView({ view: 'list' });
  }, []);

  const handleOpenDetail = useCallback((playlist: LibraryPlaylist) => {
    setSlideClass('library-slide-in-detail');
    libraryActions().setDetailScrollTop(0);
    libraryActions().setLibraryView({ view: 'detail', playlist });
  }, []);

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
      <PlaylistListView
        searchQuery={searchQuery}
        filter={filter}
        onOpenDetail={handleOpenDetail}
        onDownloadTracks={onDownloadTracks}
      />
    </div>
  );
}

