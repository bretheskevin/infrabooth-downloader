import { useState, useCallback } from 'react';
import { AppLayout, type AppPage } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { LibraryTab } from '@/features/library';
import { SearchTab } from '@/features/search';
import { PlayerContainer } from '@/features/player';
import { AppDialogs } from '@/components/AppDialogs';
import { AppProviders } from '@/providers/AppProviders';
import { useLibraryDownload } from '@/features/queue';
import { useIsSignedIn } from '@/features/auth/store';


function AppContent() {
  const [activePage, setActivePage] = useState<AppPage>('download');
  const [initialUrl, setInitialUrl] = useState('');
  const isSignedIn = useIsSignedIn();

  const handlePageChange = useCallback((page: AppPage) => {
    if (page === 'library') setInitialUrl('');
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
      {activePage === 'download' ? (
        <DownloadPage initialUrl={initialUrl} onDownloadTracks={handleDownloadTracks} />
      ) : activePage === 'library' ? (
        <section className="flex-1 min-h-0 flex flex-col">
          <LibraryTab onDownloadTracks={handleDownloadTracks} />
        </section>
      ) : (
        <section className="flex-1 min-h-0 flex flex-col">
          <SearchTab />
        </section>
      )}
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
