import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { LibraryTab } from '@/features/library';
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

  const [activePage, setActivePage] = useState<'download' | 'library'>('download');
  const [initialUrl, setInitialUrl] = useState('');
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const handlePageChange = useCallback((page: 'download' | 'library') => {
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
        isLibraryLocked={!isSignedIn}
      >
        {activePage === 'download' ? (
          <DownloadPage initialUrl={initialUrl} />
        ) : (
          <section className="flex-1 min-h-0 flex flex-col">
            <LibraryTab onDownloadTracks={handleDownloadTracks} />
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
