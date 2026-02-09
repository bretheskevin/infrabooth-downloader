import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useQueueStore } from '@/stores/queueStore';
import { useDebounce } from '@/hooks';
import { validateUrl } from '@/lib/validation';
import { fetchPlaylistInfo } from '@/lib/playlist';
import type { ValidationResult } from '@/types/url';
import type { PlaylistInfo } from '@/types/playlist';
import { UrlInput } from './UrlInput';
import { AuthPrompt } from './AuthPrompt';
import { ValidationFeedback } from './ValidationFeedback';
import { PlaylistPreview } from './PlaylistPreview';

export function DownloadSection() {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const setTracks = useQueueStore((state) => state.setTracks);
  const [url, setUrl] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
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

  // Fetch playlist when validation succeeds for playlist URLs
  useEffect(() => {
    if (validationResult?.valid && validationResult.urlType === 'playlist') {
      setIsFetchingPlaylist(true);
      fetchPlaylistInfo(url)
        .then((info) => {
          setPlaylistInfo(info);
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
        .catch((error) => {
          console.error('Failed to fetch playlist:', error);
          setPlaylistInfo(null);
        })
        .finally(() => setIsFetchingPlaylist(false));
    } else {
      setPlaylistInfo(null);
    }
  }, [validationResult, url, setTracks]);

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
    </section>
  );
}
