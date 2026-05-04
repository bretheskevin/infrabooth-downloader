import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';
import { PlaylistDetailView, fromLibraryPlaylist } from '@/components/playlist-detail';
import { libraryActions, useLibraryStore } from '../store';
import { PlaylistListView } from './PlaylistListView';

interface PlaylistsTabContentProps {
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function PlaylistsTabContent({ onDownloadTracks }: PlaylistsTabContentProps) {
  const { t } = useTranslation();
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
        <PlaylistDetailView
          playlist={fromLibraryPlaylist(libraryView.playlist)}
          breadcrumbItems={[{ label: t('library.detail.breadcrumbLibrary'), onClick: handleBackToList }]}
          onDownloadTracks={onDownloadTracks}
          scrollPreservation={{
            get: () => useLibraryStore.getState().detailScrollTop,
            set: (offset) => useLibraryStore.getState().setDetailScrollTop(offset),
          }}
        />
      </div>
    );
  }

  return (
    <div key="list" className={`flex flex-col gap-4 flex-1 min-h-0 ${slideClass}`}>
      <PlaylistListView searchQuery={searchQuery} filter={filter} onOpenDetail={handleOpenDetail} onDownloadTracks={onDownloadTracks} />
    </div>
  );
}
