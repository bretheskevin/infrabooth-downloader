import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchPlaylistInfo, fetchTrackInfo } from '@/features/url-input/api/playlist';
import { parseMediaError, type FetchError } from '@/features/url-input/utils/parseMediaError';
import type { PlaylistInfo, TrackInfo } from '@/features/url-input/types/playlist';
import type { ValidationResult } from '@/features/url-input/types/url';

export type { FetchError };

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

  const isEnabled = !!url && !!validation?.valid;
  const urlType = validation?.valid ? validation.urlType : null;

  const { data, isFetching, error: queryError } = useQuery({
    queryKey: ['media', url, urlType],
    queryFn: async () => {
      if (urlType === 'playlist') {
        return fetchPlaylistInfo(url);
      }
      return fetchTrackInfo(url);
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const error = queryError ? parseMediaError(queryError, t) : null;

  if (!isEnabled) {
    return { data: null, isLoading: false, error: null };
  }

  return {
    data: data ?? null,
    isLoading: isFetching,
    error,
  };
}
