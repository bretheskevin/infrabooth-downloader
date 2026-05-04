import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackInfo, FollowedArtist, Selection } from '@/bindings';
import { useIsSignedIn } from '@/features/auth/store';
import { useIsDownloadEnabled, useSettingsStore } from '@/features/settings';
import { UrlInput, ValidationFeedback, PlaylistPreview, TrackPreview, isPlaylist } from '@/features/url-input';
import { NewTracksCarousel, useNewTracksStore } from '@/features/new-tracks';
import { NewReleasesCarousel } from '@/features/new-releases';
import { SelectionsSection, useSelectionsStore } from '@/features/selections';
import { Spinner } from '@/components/ui/spinner';
import type { DownloadFlow } from '../hooks/useDownloadPipeline';

interface DownloadMainViewProps {
  flow: DownloadFlow;
  onDownloadTracks: (tracks: TrackInfo[], playlistTitle: string, outputDir?: string) => void | Promise<void>;
}

export function DownloadMainView({ flow, onDownloadTracks }: DownloadMainViewProps) {
  const { t } = useTranslation();
  const isSignedIn = useIsSignedIn();
  const isDownloadEnabled = useIsDownloadEnabled();

  const { url, setUrl, validation, isValidating, media, isLoading, error, handleDownload } = flow;

  const [showSuccess, setShowSuccess] = useState(false);
  useEffect(() => {
    if (validation?.valid) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowSuccess(false);
  }, [validation]);

  const errorOrValidation = error ? { valid: false as const, urlType: null, error: { ...error, hint: error.hint ?? null } } : validation;

  const displayResult = validation?.valid ? (showSuccess ? validation : null) : errorOrValidation;

  const handleSelectArtist = useCallback((artist: FollowedArtist) => {
    const hideReposts = useSettingsStore.getState().hideReposts;
    useNewTracksStore.getState().setSelectedArtist(artist, hideReposts ? 'new' : 'all');
  }, []);

  const handleSelectMix = useCallback((mix: Selection) => {
    useSelectionsStore.getState().setSelectedMix(mix);
  }, []);

  return (
    <section className="space-y-4">
      {isDownloadEnabled && (
        <>
          <UrlInput
            externalValue={url}
            onUrlChange={setUrl}
            disabled={false}
            isValidating={!isLoading && !media && isValidating}
            validationResult={isLoading || media ? null : displayResult}
          />
          <ValidationFeedback result={errorOrValidation} isValidating={isValidating} hideWhenMediaLoaded={media !== null || isLoading} />
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4" data-testid="playlist-loading">
              <Spinner className="h-4 w-4" />
              {t('download.fetchingPlaylist')}
            </div>
          )}
          {media && !isLoading && isPlaylist(media) && (
            <PlaylistPreview playlist={media} onDownload={handleDownload} isDownloading={false} />
          )}
          {media && !isLoading && !isPlaylist(media) && <TrackPreview track={media} onDownload={handleDownload} isDownloading={false} />}
        </>
      )}
      {isSignedIn && <NewTracksCarousel onSelectArtist={handleSelectArtist} />}
      {isSignedIn && <NewReleasesCarousel />}
      {isSignedIn ? (
        <SelectionsSection onSelectMix={handleSelectMix} onDownloadMix={(mix) => onDownloadTracks(mix.tracks, mix.title)} />
      ) : (
        !isDownloadEnabled && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-medium">{t('discover.signInTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('discover.signInDescription')}</p>
          </div>
        )
      )}
    </section>
  );
}
