import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AppLayout, type AppPage } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { LibraryTab } from '@/features/library';
import { SearchTab } from '@/features/search';
import { PlayerContainer } from '@/features/player';
import { AppDialogs } from '@/components/AppDialogs';
import { AppProviders } from '@/providers/AppProviders';
import { useLibraryDownload } from '@/features/queue';
import { useIsSignedIn } from '@/features/auth/store';
import { ArtistProfileView, useArtistProfileStore } from '@/features/artist-profile';
import type { TrackInfo } from '@/bindings';


function renderPageContent({
  profileArtistId,
  profileArtistName,
  activePage,
  initialUrl,
  handleCloseProfile,
  handleDownloadTracks,
}: {
  profileArtistId: number | null;
  profileArtistName: string | null;
  activePage: AppPage;
  initialUrl: string;
  handleCloseProfile: () => void;
  handleDownloadTracks: (tracks: TrackInfo[], title: string) => void | Promise<void>;
}) {
  if (profileArtistId && profileArtistName) {
    return (
      <section className="space-y-4 flex-1 min-h-0 flex flex-col">
        <ArtistProfileView
          artistId={profileArtistId}
          artistName={profileArtistName}
          onBack={handleCloseProfile}
          onDownloadTracks={handleDownloadTracks}
        />
      </section>
    );
  }

  if (activePage === 'download') {
    return <DownloadPage initialUrl={initialUrl} onDownloadTracks={handleDownloadTracks} />;
  }

  if (activePage === 'library') {
    return (
      <section className="flex-1 min-h-0 flex flex-col">
        <LibraryTab onDownloadTracks={handleDownloadTracks} />
      </section>
    );
  }

  return (
    <section className="flex-1 min-h-0 flex flex-col">
      <SearchTab />
    </section>
  );
}

function AppContent() {
  const [activePage, setActivePage] = useState<AppPage>('download');
  const [initialUrl, setInitialUrl] = useState('');
  const isSignedIn = useIsSignedIn();
  const { profileArtistId, profileArtistName } = useArtistProfileStore(
    useShallow((s) => ({ profileArtistId: s.profileArtistId, profileArtistName: s.profileArtistName })),
  );

  const handleCloseProfile = useCallback(() => {
    useArtistProfileStore.getState().closeProfile();
  }, []);

  const handlePageChange = useCallback((page: AppPage) => {
    if (page === 'library') setInitialUrl('');
    useArtistProfileStore.getState().closeProfile();
    setActivePage(page);
  }, []);

  const {
    handleDownloadTracks,
    pendingDownload,
    handleConfirmReplace,
    handleCancelReplace,
  } = useLibraryDownload({
    onNavigateToDownload: () => setActivePage('download'),
  });

  return (
    <AppLayout
      activePage={activePage}
      onPageChange={handlePageChange}
      isSignedIn={isSignedIn}
    >
      {renderPageContent({
        profileArtistId,
        profileArtistName,
        activePage,
        initialUrl,
        handleCloseProfile,
        handleDownloadTracks,
      })}
      <PlayerContainer />
      <AppDialogs
        pendingDownload={pendingDownload}
        onConfirmReplace={handleConfirmReplace}
        onCancelReplace={handleCancelReplace}
      />
    </AppLayout>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
