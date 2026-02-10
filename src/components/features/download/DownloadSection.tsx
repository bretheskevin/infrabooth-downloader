import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { useDownloadFlow, useDownloadProgress, useDownloadCompletion } from '@/hooks/download';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';
import { UrlInput } from './UrlInput';
import { AuthPrompt } from './AuthPrompt';
import { ValidationFeedback } from './ValidationFeedback';
import { PlaylistPreview } from './PlaylistPreview';
import { TrackPreview } from './TrackPreview';
import { CompletionPanel } from './CompletionPanel';
import { ProgressPanel } from '../progress/ProgressPanel';
import { RateLimitBanner } from '../progress/RateLimitBanner';

function isPlaylist(media: PlaylistInfo | TrackInfo): media is PlaylistInfo {
  return 'tracks' in media;
}

export function DownloadSection() {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const isProcessing = useQueueStore((state) => state.isProcessing);
  const isRateLimited = useQueueStore((state) => state.isRateLimited);

  const {
    setUrl,
    validation,
    isValidating,
    media,
    isLoading,
    error,
    handleDownload,
  } = useDownloadFlow();

  // Subscribe to backend progress events
  useDownloadProgress();

  // Get completion state
  const { isComplete, completedCount, failedCount, totalCount, resetQueue } =
    useDownloadCompletion();

  // Track when download is starting (between click and processing)
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  // Reset starting state when processing begins
  useEffect(() => {
    if (isProcessing) {
      setIsStartingDownload(false);
    }
  }, [isProcessing]);

  // Wrap handleDownload to track starting state
  const handleDownloadWithLoading = useCallback(() => {
    setIsStartingDownload(true);
    handleDownload();
  }, [handleDownload]);

  // Handle "Download Another" - reset state and clear URL
  const handleDownloadAnother = useCallback(() => {
    resetQueue();
    setUrl('');
  }, [resetQueue, setUrl]);

  // Success border auto-dismiss
  const [showSuccess, setShowSuccess] = useState(false);
  useEffect(() => {
    if (validation?.valid) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowSuccess(false);
  }, [validation]);

  // Display result for border (success fades, errors persist)
  const displayResult = validation?.valid
    ? (showSuccess ? validation : null)
    : (error ? { valid: false as const, error } : validation);

  // Show completion panel when download is done
  if (isComplete) {
    return (
      <section className="space-y-4">
        <CompletionPanel
          completedCount={completedCount}
          totalCount={totalCount}
          failedCount={failedCount}
          onDownloadAnother={handleDownloadAnother}
        />
      </section>
    );
  }

  // Show progress panel when downloading
  if (isProcessing) {
    return (
      <section className="space-y-4">
        {isRateLimited && <RateLimitBanner />}
        <ProgressPanel />
      </section>
    );
  }

  // Show starting download spinner
  if (isStartingDownload) {
    return (
      <section className="space-y-4">
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="download-starting"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('download.startingDownload')}
        </div>
      </section>
    );
  }

  // Default: show URL input and preview
  return (
    <section className="space-y-4">
      <div className="relative">
        <UrlInput
          onUrlChange={setUrl}
          disabled={!isSignedIn || isProcessing}
          isValidating={isValidating}
          validationResult={displayResult}
        />
        {!isSignedIn && <AuthPrompt />}
      </div>
      <ValidationFeedback
        result={error ? { valid: false as const, error } : validation}
        isValidating={isValidating}
      />
      {isLoading && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground mt-4"
          data-testid="playlist-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('download.fetchingPlaylist')}
        </div>
      )}
      {media && !isLoading && isPlaylist(media) && (
        <PlaylistPreview
          playlist={media}
          onDownload={handleDownloadWithLoading}
          isDownloading={isProcessing}
        />
      )}
      {media && !isLoading && !isPlaylist(media) && (
        <TrackPreview
          track={media}
          onDownload={handleDownloadWithLoading}
          isDownloading={isProcessing}
        />
      )}
    </section>
  );
}
