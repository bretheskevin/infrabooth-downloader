import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { useDebounce } from '@/hooks';
import { validateUrl } from '@/lib/validation';
import { fetchPlaylistInfo, fetchTrackInfo } from '@/lib/playlist';
import type { ValidationResult } from '@/types/url';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';
import { UrlInput } from './UrlInput';
import { AuthPrompt } from './AuthPrompt';
import { ValidationFeedback } from './ValidationFeedback';
import { PlaylistPreview } from './PlaylistPreview';
import { TrackPreview } from './TrackPreview';

export function DownloadSection() {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const setTracks = useQueueStore((state) => state.setTracks);
  const [url, setUrl] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);

  const debouncedUrl = useDebounce(url, 300);

  useEffect(() => {
    if (!debouncedUrl) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    validateUrl(debouncedUrl)
      .then(setValidationResult)
      .finally(() => setIsValidating(false));
  }, [debouncedUrl]);

  // Handle fetch errors with user-friendly messages
  const handleFetchError = useCallback(
    (error: Error) => {
      const message = error.message;
      if (message.includes('not found') || message.includes('Track not found')) {
        setValidationResult({
          valid: false,
          error: {
            code: 'INVALID_URL',
            message: t('errors.trackNotFound'),
            hint: t('errors.trackNotFoundHint'),
          },
        });
      } else if (message.includes('region') || message.includes('GeoBlocked')) {
        setValidationResult({
          valid: false,
          error: {
            code: 'GEO_BLOCKED',
            message: t('errors.geoBlocked'),
          },
        });
      } else {
        console.error('Failed to fetch:', error);
      }
    },
    [t]
  );

  // Fetch metadata when validation succeeds
  useEffect(() => {
    if (!validationResult?.valid) {
      setPlaylistInfo(null);
      setTrackInfo(null);
      return;
    }

    setIsFetchingPlaylist(true);

    if (validationResult.urlType === 'playlist') {
      fetchPlaylistInfo(url)
        .then((info) => {
          setPlaylistInfo(info);
          setTrackInfo(null);
          // Store tracks in queue
          setTracks(
            info.tracks.map((track) => ({
              id: String(track.id),
              title: track.title,
              artist: track.user.username,
              artworkUrl: track.artwork_url,
              status: 'pending' as const,
            }))
          );
        })
        .catch(handleFetchError)
        .finally(() => setIsFetchingPlaylist(false));
    } else if (validationResult.urlType === 'track') {
      fetchTrackInfo(url)
        .then((info) => {
          setTrackInfo(info);
          setPlaylistInfo(null);
          // Single track in queue
          setTracks([
            {
              id: String(info.id),
              title: info.title,
              artist: info.user.username,
              artworkUrl: info.artwork_url,
              status: 'pending' as const,
            },
          ]);
        })
        .catch(handleFetchError)
        .finally(() => setIsFetchingPlaylist(false));
    }
  }, [validationResult, url, setTracks, handleFetchError]);

  // Auto-dismiss success border after 2 seconds
  useEffect(() => {
    if (validationResult?.valid) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowSuccess(false);
  }, [validationResult]);

  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setPlaylistInfo(null); // Clear preview immediately on URL change
    setTrackInfo(null);
    if (!newUrl) {
      setValidationResult(null);
    }
  }, []);

  const handleDownload = useCallback(() => {
    // Will be implemented in Epic 4
    console.log('Starting download...');
  }, []);

  // For border display: show success only while showSuccess is true, always show errors
  const displayResult = validationResult?.valid
    ? (showSuccess ? validationResult : null)
    : validationResult;

  return (
    <section className="space-y-4">
      <div className="relative">
        <UrlInput
          onUrlChange={handleUrlChange}
          disabled={!isSignedIn}
          isValidating={isValidating}
          validationResult={displayResult}
        />
        {!isSignedIn && <AuthPrompt />}
      </div>
      <ValidationFeedback
        result={validationResult}
        isValidating={isValidating}
      />
      {/* Playlist fetching state */}
      {isFetchingPlaylist && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground mt-4"
          data-testid="playlist-loading"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('download.fetchingPlaylist')}
        </div>
      )}
      {/* Playlist preview */}
      {playlistInfo && !isFetchingPlaylist && (
        <PlaylistPreview playlist={playlistInfo} onDownload={handleDownload} />
      )}
      {/* Track preview */}
      {trackInfo && !isFetchingPlaylist && (
        <TrackPreview track={trackInfo} onDownload={handleDownload} />
      )}
    </section>
  );
}
