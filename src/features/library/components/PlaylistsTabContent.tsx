import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { libraryActions, useLibraryStore } from '../store';
import { PlaylistDetailView } from './PlaylistDetailView';
import { PlaylistListView } from './PlaylistListView';

interface PlaylistsTabContentProps {
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function PlaylistsTabContent({ onDownloadTracks }: PlaylistsTabContentProps) {
  const { searchQuery, filter, libraryView } = useLibraryStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      filter: s.filter,
      libraryView: s.libraryView,
    })),
  );
  const [slideClass, setSlideClass] = useState('');

  const handleBackToList = () => {
    setSlideClass('library-slide-in-list');
    libraryActions().setLibraryView({ view: 'list' });
  };

  const handleOpenDetail = (playlist: LibraryPlaylist) => {
    setSlideClass('library-slide-in-detail');
    libraryActions().setDetailScrollTop(0);
    libraryActions().setLibraryView({ view: 'detail', playlist });
  };

  if (libraryView.view === 'detail') {
    return (
      <div key="detail" className={`flex-1 min-h-0 flex flex-col ${slideClass}`}>
        <PlaylistDetailView playlist={libraryView.playlist} onBack={handleBackToList} onDownloadTracks={onDownloadTracks} />
      </div>
    );
  }

  return (
    <div key="list" className={`flex flex-col gap-4 flex-1 min-h-0 ${slideClass}`}>
      <PlaylistListView searchQuery={searchQuery} filter={filter} onOpenDetail={handleOpenDetail} onDownloadTracks={onDownloadTracks} />
    </div>
  );
}
