import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDownloadFlow } from '@/hooks/download';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';
import { UrlInput } from './UrlInput';
import { AuthPrompt } from './AuthPrompt';
import { ValidationFeedback } from './ValidationFeedback';
import { PlaylistPreview } from './PlaylistPreview';
import { TrackPreview } from './TrackPreview';

function isPlaylist(media: PlaylistInfo | TrackInfo): media is PlaylistInfo {
  return 'tracks' in media;
}

export function DownloadSection() {
  const { t } = useTranslation();
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  const {
    setUrl,
    validation,
    isValidating,
    media,
    isLoading,
    error,
    handleDownload,
  } = useDownloadFlow();

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

  return (
    <section className="space-y-4">
      <div className="relative">
        <UrlInput
          onUrlChange={setUrl}
          disabled={!isSignedIn}
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
        <PlaylistPreview playlist={media} onDownload={handleDownload} />
      )}
      {media && !isLoading && !isPlaylist(media) && (
        <TrackPreview track={media} onDownload={handleDownload} />
      )}
    </section>
  );
}
