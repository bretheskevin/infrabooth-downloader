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
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  useQueueStore,
  startDownloadQueue,
  cancelDownloadQueue,
  waitForQueueIdle,
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

  const { t } = useTranslation();
  const [activePage, setActivePage] = useState<'download' | 'library'>('download');
  const [initialUrl, setInitialUrl] = useState('');
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const [pendingDownload, setPendingDownload] = useState<{
    tracks: TrackInfo[];
    playlistTitle: string;
  } | null>(null);

  const handlePageChange = useCallback((page: 'download' | 'library') => {
    if (page === 'library') setInitialUrl('');
    setActivePage(page);
  }, []);

  const executeDownload = useCallback(
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

  const handleDownloadTracks = useCallback(
    (tracks: TrackInfo[], playlistTitle: string) => {
      const { isProcessing, isCancelling } = useQueueStore.getState();

      if (isProcessing || isCancelling) {
        setPendingDownload({ tracks, playlistTitle });
        return;
      }

      executeDownload(tracks, playlistTitle);
    },
    [executeDownload],
  );

  const handleConfirmReplace = useCallback(async () => {
    if (!pendingDownload) return;
    const { tracks, playlistTitle } = pendingDownload;
    setPendingDownload(null);

    try {
      await cancelDownloadQueue();
      await waitForQueueIdle();
    } catch (error) {
      console.error('[App] Failed to cancel current download:', error);
      toast.error(t('library.detail.conflictError'));
      return;
    }

    useQueueStore.getState().clearQueue();
    executeDownload(tracks, playlistTitle);
  }, [pendingDownload, executeDownload, t]);

  const handleCancelReplace = useCallback(() => {
    setPendingDownload(null);
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
