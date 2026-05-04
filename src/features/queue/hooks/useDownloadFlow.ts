import { useState, useCallback, useEffect, useRef } from 'react';
import { useMediaInfoFetcher } from './useMediaInfoFetcher';
import { useDownloadInitiator } from './useDownloadInitiator';
import { useSyncToQueue } from './useSyncToQueue';
import { useQueueStore } from '@/features/queue/store';
import { useUrlValidation } from '@/features/url-input';
import { logger } from '@/lib/logger';
import type { ValidationResult, PlaylistInfo, TrackInfo, FetchError } from '@/features/url-input';

interface UseDownloadFlowReturn {
  url: string;
  setUrl: (url: string) => void;
  validation: ValidationResult | null;
  isValidating: boolean;
  media: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: FetchError | null;
  isPending: boolean;
  handleDownload: (overrideOutputDir?: string) => void;
}

export function useDownloadFlow(initialUrl = ''): UseDownloadFlowReturn {
  const [url, setUrl] = useState(initialUrl);
  const [isPending, setIsPending] = useState(false);
  const lastFetchedUrlRef = useRef<string | null>(null);

  const isProcessing = useQueueStore((state) => state.isProcessing);
  const isComplete = useQueueStore((state) => state.isComplete);

  const { result: validation, isValidating } = useUrlValidation(url);
  const { mediaInfo, isLoading: isFetching, error, fetchInfo, clear } = useMediaInfoFetcher();
  const { initiateDownload } = useDownloadInitiator();

  useEffect(() => {
    if (validation?.valid && url && url !== lastFetchedUrlRef.current) {
      lastFetchedUrlRef.current = url;
      fetchInfo(url);
    }
  }, [validation, url, fetchInfo]);

  useEffect(() => {
    if (!url) {
      lastFetchedUrlRef.current = null;
      clear();
    }
  }, [url, clear]);

  const media = mediaInfo;
  const isLoading = isValidating || isFetching;

  useSyncToQueue(media);

  useEffect(() => {
    if (isProcessing || isComplete) {
      setIsPending(false);
    }
  }, [isProcessing, isComplete]);

  const handleDownload = useCallback(
    async (overrideOutputDir?: string) => {
      if (!media) {
        void logger.warn('[useDownloadFlow] No media available, aborting download');
        return;
      }

      setIsPending(true);

      try {
        await initiateDownload(media, overrideOutputDir);
      } catch (downloadError) {
        void logger.error(`[useDownloadFlow] Download failed: ${downloadError}`);
        setIsPending(false);
      }
    },
    [media, initiateDownload],
  );

  return {
    url,
    setUrl,
    validation,
    isValidating,
    media,
    isLoading,
    error,
    isPending,
    handleDownload,
  };
}
