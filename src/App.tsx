import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DownloadPage } from '@/pages/DownloadPage';
import { LibraryTab } from '@/features/library';
import { AuthChoiceDialog } from '@/features/auth/components/AuthChoiceDialog';
import { useAuthChoiceDialog } from '@/features/auth/hooks/useAuthChoiceDialog';
import { useAuthStore } from '@/features/auth/store';
import { RateLimitDialog } from '@/features/queue/components/RateLimitDialog';
import { useRateLimitDialog } from '@/features/queue/hooks/useRateLimitDialog';
import {
  useQueueStore,
  startDownloadQueue,
  trackInfoToQueueTrack,
  queueTrackToDownloadRequest,
} from '@/features/queue';
import { useSettingsStore } from '@/features/settings';
import type { TrackInfo } from '@/bindings';
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

  const handleDownloadTracks = useCallback(
    async (tracks: TrackInfo[], playlistTitle: string) => {
      const { isComplete, failedCount, clearQueue, enqueueTracks, setInitializing, setOutputDir } =
        useQueueStore.getState();
      const { downloadPath, maxConcurrentDownloads, preservePlaylistOrder } =
        useSettingsStore.getState();

      if (isComplete && failedCount > 0) return;
      if (isComplete) clearQueue();

      const queueTracks = tracks.map(trackInfoToQueueTrack);
      enqueueTracks(queueTracks);

      setOutputDir(downloadPath || null);
      setInitializing(true);
      setActivePage('download');

      try {
        await startDownloadQueue({
          tracks: queueTracks.map(queueTrackToDownloadRequest),
          albumName: playlistTitle,
          outputDir: downloadPath || null,
          maxConcurrent: maxConcurrentDownloads,
          preserveOrder: preservePlaylistOrder,
        });
      } catch (error) {
        console.error('[App] Download from library failed:', error);
        useQueueStore.getState().setInitializing(false);
      }
    },
    [],
  );

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
    </AppLayout>
  );
}
