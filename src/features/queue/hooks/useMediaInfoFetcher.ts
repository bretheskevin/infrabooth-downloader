import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { commands } from '@/bindings';
import { fetchMediaInfo } from '@/features/url-input/api/playlist';
import { parseMediaError, type FetchError } from '@/features/url-input/utils/parseMediaError';
import type { PlaylistInfo, TrackInfo, ValidationResult } from '@/bindings';

type MediaInfo = PlaylistInfo | TrackInfo;

interface UseMediaInfoFetcherReturn {
  mediaInfo: MediaInfo | null;
  validatedUrl: string | null;
  validation: ValidationResult | null;
  isLoading: boolean;
  error: FetchError | null;
  fetchInfo: (url: string) => void;
  clear: () => void;
}

export function useMediaInfoFetcher(): UseMediaInfoFetcherReturn {
  const { t } = useTranslation();
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (url: string) => {
      const validationResult = await commands.validateSoundcloudUrl(url);

      if (!validationResult.valid) {
        const errorMessage = validationResult.error?.message ?? 'Invalid URL';
        throw new Error(errorMessage);
      }

      const info = await fetchMediaInfo(url, validationResult.urlType);
      return { url, info, validation: validationResult };
    },
    onSuccess: ({ url, info, validation: validationResult }) => {
      setValidatedUrl(url);
      setMediaInfo(info);
      setValidation(validationResult);
    },
  });

  const { mutate, reset } = mutation;

  const fetchInfo = useCallback(
    (url: string) => {
      mutate(url);
    },
    [mutate]
  );

  const clear = useCallback(() => {
    setValidatedUrl(null);
    setMediaInfo(null);
    setValidation(null);
    reset();
  }, [reset]);

  const error = useMemo(
    () => (mutation.error ? parseMediaError(mutation.error, t) : null),
    [mutation.error, t]
  );

  return {
    mediaInfo,
    validatedUrl,
    validation,
    isLoading: mutation.isPending,
    error,
    fetchInfo,
    clear,
  };
}
