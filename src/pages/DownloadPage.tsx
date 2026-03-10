import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useQueueStore, useDownloadFlow, useDownloadProgress, useDownloadCompletion } from '@/features/queue';
import { UrlInput, ValidationFeedback, PlaylistPreview, TrackPreview, isPlaylist } from '@/features/url-input';
import { CompletionPanel } from '@/features/completion';
import { ProgressPanel } from '@/features/progress/components/ProgressPanel';
import { LibraryTab } from '@/features/library';
import { useAuthStore } from '@/features/auth/store';

export function DownloadPage() {
  const { t } = useTranslation();
  const isProcessing = useQueueStore((state) => state.isProcessing);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const [activeTab, setActiveTab] = useState<'paste' | 'library'>('paste');

  const {
    url,
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

  const handleSelectLibraryPlaylist = useCallback((permalinkUrl: string) => {
    setUrl(permalinkUrl);
    setActiveTab('paste');
  }, [setUrl]);

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
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'paste'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('paste')}
        >
          {t('library.pasteUrlTab')}
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'library'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          } ${!isSignedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => isSignedIn && setActiveTab('library')}
          disabled={!isSignedIn}
        >
          {!isSignedIn && <Lock className="h-3 w-3" />}
          {t('library.tabLabel')}
        </button>
      </div>

      {activeTab === 'paste' ? (
        <>
          <UrlInput
            externalValue={url}
            onUrlChange={setUrl}
            disabled={isProcessing}
            isValidating={!isLoading && !media && isValidating}
            validationResult={isLoading || media ? null : displayResult}
          />
          <ValidationFeedback
            result={error ? { valid: false as const, urlType: null, error: { ...error, hint: error.hint ?? null } } : validation}
            isValidating={isValidating}
            hideWhenMediaLoaded={media !== null || isLoading}
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
        </>
      ) : (
        <LibraryTab onSelectPlaylist={handleSelectLibraryPlaylist} />
      )}
    </section>
  );
}
