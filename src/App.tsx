import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { LibraryTab } from '@/features/library';
import { AuthChoiceDialog } from '@/features/auth/components/AuthChoiceDialog';
import { useAuthChoiceDialog } from '@/features/auth/hooks/useAuthChoiceDialog';
import { useAuthStore } from '@/features/auth/store';
import { RateLimitDialog } from '@/features/queue/components/RateLimitDialog';
import { useRateLimitDialog } from '@/features/queue/hooks/useRateLimitDialog';
import { useQueueStore } from '@/features/queue';
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

  const handleSelectLibraryPlaylist = useCallback((permalinkUrl: string) => {
    const { isComplete, failedCount, clearQueue } = useQueueStore.getState();
    if (isComplete && failedCount > 0) return;
    if (isComplete) clearQueue();
    setInitialUrl(permalinkUrl);
    setActivePage('download');
  }, []);

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
    <AppLayout
      activePage={activePage}
      onPageChange={handlePageChange}
      isLibraryLocked={!isSignedIn}
    >
      {activePage === 'download' ? (
        <DownloadPage initialUrl={initialUrl} />
      ) : (
        <section className="space-y-4">
          <LibraryTab onSelectPlaylist={handleSelectLibraryPlaylist} />
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
    </AppLayout>
  );
}
