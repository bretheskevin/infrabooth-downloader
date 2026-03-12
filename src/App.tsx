import { useState, useEffect, useCallback } from 'react';
import { AppLayout, type AppPage } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { LibraryTab } from '@/features/library';
import { SearchTab } from '@/features/search';
import { AuthChoiceDialog } from '@/features/auth/components/AuthChoiceDialog';
import { useAuthChoiceDialog } from '@/features/auth/hooks/useAuthChoiceDialog';
import { useAuthStore } from '@/features/auth/store';
import { RateLimitDialog } from '@/features/queue/components/RateLimitDialog';
import { useRateLimitDialog } from '@/features/queue/hooks/useRateLimitDialog';
import { DownloadConflictDialog } from '@/features/queue/components/DownloadConflictDialog';
import { useLibraryDownload } from '@/features/queue';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useUpdateStore } from '@/features/update';
import { useLanguageSync, useThemeSync, useAuthStateListener, useStartupAuth, useInitializeSettings } from '@/hooks';

export function App() {
  useLanguageSync();
  useThemeSync();
  useAuthStateListener();
  useStartupAuth();
  useInitializeSettings();
  useEffect(() => {
    useUpdateStore.getState().checkForUpdates();
  }, []);

  const [activePage, setActivePage] = useState<AppPage>('download');
  const [initialUrl, setInitialUrl] = useState('');
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

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

  const {
    isOpen: authChoiceOpen,
    handleReAuthenticate,
    handleContinueStandard,
  } = useAuthChoiceDialog();

  const {
    isOpen: rateLimitOpen,
    handleRetry: handleRateLimitRetry,
    handleStop: handleRateLimitStop,
  } = useRateLimitDialog();

  return (
    <TooltipProvider>
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
        <AuthChoiceDialog
          open={authChoiceOpen}
          onReAuthenticate={handleReAuthenticate}
          onContinueStandard={handleContinueStandard}
        />
        <RateLimitDialog
          open={rateLimitOpen}
          onRetry={handleRateLimitRetry}
          onStop={handleRateLimitStop}
        />
        <DownloadConflictDialog
          open={pendingDownload !== null}
          onConfirm={handleConfirmReplace}
          onCancel={handleCancelReplace}
        />
        <Toaster />
      </AppLayout>
    </TooltipProvider>
  );
}
