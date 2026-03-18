import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppLayout, type AppPage } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { LibraryTab } from '@/features/library';
import { SearchTab } from '@/features/search';
import { PlayerContainer } from '@/features/player';
import { AppDialogs } from '@/components/AppDialogs';
import { AppProviders } from '@/providers/AppProviders';
import { useLibraryDownload } from '@/features/queue';
import { useIsSignedIn } from '@/features/auth/store';
import { useIsDownloadEnabled } from '@/features/settings';

function AppContent() {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState<AppPage>('download');
  const [initialUrl, setInitialUrl] = useState('');
  const isSignedIn = useIsSignedIn();
  const isDownloadEnabled = useIsDownloadEnabled();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isDownloadEnabled && activePage === 'download') {
      setActivePage('library');
      if (hasInitialized.current) {
        toast.info(t('settings.streamModeEnabled'));
      }
    }
    hasInitialized.current = true;
  }, [isDownloadEnabled, activePage, t]);

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
        <DownloadPage initialUrl={initialUrl} />
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
