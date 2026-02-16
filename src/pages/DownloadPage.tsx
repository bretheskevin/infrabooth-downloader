import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import { useQueueStore, useDownloadFlow, useDownloadProgress, useDownloadCompletion } from '@/features/queue';
import { UrlInput, ValidationFeedback, PlaylistPreview, TrackPreview, isPlaylist } from '@/features/url-input';
import { CompletionPanel } from '@/features/completion';
import { ProgressPanel } from '@/features/progress/components/ProgressPanel';
import { RateLimitBanner } from '@/features/progress/components/RateLimitBanner';

export function DownloadPage() {
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
    isPending,
    handleDownload,
  } = useDownloadFlow();

  useDownloadProgress();

  const { isComplete, completedCount, failedCount, cancelledCount, totalCount, isCancelled, resetQueue } =
    useDownloadCompletion();

  const handleDownloadAnother = useCallback(() => {
    resetQueue();
    setUrl('');
  }, [resetQueue, setUrl]);

  const [showSuccess, setShowSuccess] = useState(false);
  useEffect(() => {
    if (validation?.valid) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowSuccess(false);
  }, [validation]);

  const displayResult = validation?.valid
    ? (showSuccess ? validation : null)
    : (error ? { valid: false as const, urlType: null, error: { ...error, hint: error.hint ?? null } } : validation);

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

  if (isProcessing) {
    return (
      <section className="space-y-4">
        {isRateLimited && <RateLimitBanner />}
        <ProgressPanel />
      </section>
    );
  }

  if (isPending) {
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

  return (
    <section className="space-y-4">
      <UrlInput
        onUrlChange={setUrl}
        disabled={isProcessing}
        isValidating={isValidating}
        validationResult={displayResult}
      />
      <ValidationFeedback
        result={error ? { valid: false as const, urlType: null, error: { ...error, hint: error.hint ?? null } } : validation}
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
          onDownload={handleDownload}
          isDownloading={isProcessing}
        />
      )}
      {media && !isLoading && !isPlaylist(media) && (
        <TrackPreview
          track={media}
          onDownload={handleDownload}
          isDownloading={isProcessing}
        />
      )}
    </section>
  );
}
