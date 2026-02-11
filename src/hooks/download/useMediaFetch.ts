import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchPlaylistInfo, fetchTrackInfo } from '@/lib/playlist';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';
import type { ValidationResult } from '@/types/url';

export interface FetchError {
  code: string;
  message: string;
  hint?: string;
}

interface UseMediaFetchReturn {
  data: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: FetchError | null;
}

export function useMediaFetch(
  url: string,
  validation: ValidationResult | null
): UseMediaFetchReturn {
  const { t } = useTranslation();
  const [data, setData] = useState<PlaylistInfo | TrackInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FetchError | null>(null);

  // Use ref to avoid t causing infinite loops
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let isCancelled = false;

    if (!url || !validation?.valid) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchFn =
      validation.urlType === 'playlist' ? fetchPlaylistInfo : fetchTrackInfo;

    fetchFn(url)
      .then((result) => {
        if (isCancelled) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (isCancelled) return;

        const message = typeof err === 'string' ? err : (err as Error)?.message ?? '';
        const translate = tRef.current;

        if (message.includes('401') || message.includes('Unauthorized')) {
          setError({
            code: 'AUTH_EXPIRED',
            message: translate('errors.authExpired'),
            hint: translate('errors.authExpiredHint'),
          });
        } else if (message.includes('not found') || message.includes('Track not found') || message.includes('404')) {
          setError({
            code: 'INVALID_URL',
            message: translate('errors.trackNotFound'),
            hint: translate('errors.trackNotFoundHint'),
          });
        } else if (message.includes('region') || message.includes('GeoBlocked') || message.includes('403')) {
          setError({
            code: 'GEO_BLOCKED',
            message: translate('errors.geoBlocked'),
          });
        } else if (message.includes('NoToken')) {
          setError({
            code: 'NOT_SIGNED_IN',
            message: translate('errors.notSignedIn'),
          });
        } else if (message.includes('TokenExpired')) {
          setError({
            code: 'TOKEN_EXPIRED',
            message: translate('errors.authExpired'),
            hint: translate('errors.authExpiredHint'),
          });
        } else {
          setError({
            code: 'FETCH_FAILED',
            message: translate('errors.fetchFailed'),
          });
        }
        setData(null);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [url, validation]);

  return { data, isLoading, error };
}
