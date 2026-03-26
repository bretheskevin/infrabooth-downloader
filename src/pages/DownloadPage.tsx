import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Selection, TrackInfo, FollowedArtist } from '@/bindings';
import { Spinner } from '@/components/ui/spinner';
import { useQueueStore, useDownloadFlow, useDownloadCompletion } from '@/features/queue';
import { UrlInput, ValidationFeedback, PlaylistPreview, TrackPreview, isPlaylist } from '@/features/url-input';
import { CompletionPanel } from '@/features/completion';
import { ProgressPanel } from '@/features/progress/components/ProgressPanel';
import { SelectionsSection, useSelectionsStore } from '@/features/selections';
import { PlaylistDetailView } from '@/features/library/components/PlaylistDetailView';
import { NewTracksCarousel, ArtistDetailView, useNewTracksStore } from '@/features/new-tracks';
import { useIsSignedIn } from '@/features/auth/store';
import { useIsDownloadEnabled } from '@/features/settings';
import { toLibraryPlaylist } from '@/features/selections/utils/adapter';
import { cn } from '@/lib/utils';

interface DownloadPageProps {
  initialUrl?: string;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function DownloadPage({ initialUrl, onDownloadTracks }: DownloadPageProps) {
  const { t } = useTranslation();
  const isSignedIn = useIsSignedIn();
  const isDownloadEnabled = useIsDownloadEnabled();
  const isProcessing = useQueueStore((state) => state.isProcessing);
  const isInitializing = useQueueStore((state) => state.isInitializing);
  const selectedMix = useSelectionsStore((s) => s.selectedMix);
  const { setSelectedMix, clearSelectedMix } = useSelectionsStore.getState();
  const selectedArtist = useNewTracksStore((s) => s.selectedArtist);
  const { setSelectedArtist, clearSelectedArtist } = useNewTracksStore.getState();
  const [slideClass, setSlideClass] = useState('');

  useEffect(() => {
    if (!isSignedIn) {
      clearSelectedMix();
      clearSelectedArtist();
    }
  }, [isSignedIn]);

  const handleSelectMix = useCallback((mix: Selection) => {
    setSlideClass('library-slide-in-detail');
    setSelectedMix(mix);
  }, []);

  const handleBackFromMix = useCallback(() => {
    setSlideClass('library-slide-in-list');
    clearSelectedMix();
  }, []);

  const handleSelectArtist = useCallback((artist: FollowedArtist) => {
    setSlideClass('library-slide-in-detail');
    setSelectedArtist(artist);
  }, []);

  const handleBackFromArtist = useCallback(() => {
    setSlideClass('library-slide-in-list');
    clearSelectedArtist();
  }, []);

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
  } = useDownloadFlow(initialUrl);

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
        <ProgressPanel />
      </section>
    );
  }

  if (selectedArtist) {
    return (
      <section key="artist-detail" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <ArtistDetailView
          artist={selectedArtist}
          onBack={handleBackFromArtist}
          onDownloadTracks={onDownloadTracks}
        />
      </section>
    );
  }

  if (selectedMix) {
    return (
      <section key="mix-detail" className={cn('space-y-4 flex-1 min-h-0 flex flex-col', slideClass)}>
        <PlaylistDetailView
          playlist={toLibraryPlaylist(selectedMix)}
          initialTracks={selectedMix.tracks}
          onBack={handleBackFromMix}
          onDownloadTracks={onDownloadTracks}
        />
      </section>
    );
  }

  if (isPending || isInitializing) {
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
    <section key="download-main" className={cn('space-y-4', slideClass)}>
      {isDownloadEnabled && (
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
      )}
      {isSignedIn && <NewTracksCarousel onSelectArtist={handleSelectArtist} />}
      {isSignedIn ? (
        <SelectionsSection
          onSelectMix={handleSelectMix}
          onDownloadMix={(mix) => onDownloadTracks(mix.tracks, mix.title)}
        />
      ) : !isDownloadEnabled && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm font-medium">{t('discover.signInTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('discover.signInDescription')}</p>
        </div>
      )}
    </section>
  );
}
