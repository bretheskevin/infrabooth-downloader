import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import { useQueueStore } from '@/features/download/store';
import { useDownloadFlow, useDownloadProgress, useDownloadCompletion } from '@/features/download/hooks';
import { isPlaylist } from '@/features/download/types/playlist';
import { UrlInput } from './UrlInput';
import { ValidationFeedback } from './ValidationFeedback';
import { PlaylistPreview } from './PlaylistPreview';
import { TrackPreview } from './TrackPreview';
import { CompletionPanel } from './CompletionPanel';
import { ProgressPanel } from '@/features/progress/components/ProgressPanel';
import { RateLimitBanner } from '@/features/progress/components/RateLimitBanner';

export function DownloadSection() {
  const { t } = useTranslation();
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
  const { isComplete, completedCount, failedCount, cancelledCount, totalCount, isCancelled, resetQueue } =
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
    setIsStartingDownload(false);
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
          cancelledCount={cancelledCount}
          isCancelled={isCancelled}
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
          className="flex flex-col items-center justify-center gap-4 py-16"
          data-testid="download-starting"
        >
          <Spinner className="h-12 w-12 text-primary" />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium">{t('download.startingDownload')}</p>
            <p className="text-sm text-muted-foreground">{t('download.preparingTracks')}</p>
          </div>
        </div>
      </section>
    );
  }

  // Default: show URL input and preview
  return (
    <section className="space-y-4">
      <UrlInput
        onUrlChange={setUrl}
        disabled={isProcessing}
        isValidating={isValidating}
        validationResult={displayResult}
      />
      <ValidationFeedback
        result={error ? { valid: false as const, error } : validation}
        isValidating={isValidating}
      />
      {isLoading && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground mt-4"
          data-testid="playlist-loading"
        >
          <Spinner className="h-4 w-4" />
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
