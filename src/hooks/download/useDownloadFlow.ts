import { useState, useCallback } from 'react';
import { useUrlValidation } from './useUrlValidation';
import { useMediaFetch, type FetchError } from './useMediaFetch';
import { useSyncToQueue } from './useSyncToQueue';
import type { ValidationResult } from '@/types/url';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

interface UseDownloadFlowReturn {
  url: string;
  setUrl: (url: string) => void;
  validation: ValidationResult | null;
  isValidating: boolean;
  media: PlaylistInfo | TrackInfo | null;
  isLoading: boolean;
  error: FetchError | null;
  handleDownload: () => void;
}

export function useDownloadFlow(): UseDownloadFlowReturn {
  const [url, setUrl] = useState('');

  const { result: validation, isValidating } = useUrlValidation(url);
  const { data: media, isLoading, error } = useMediaFetch(url, validation);

  // Sync to queue whenever media changes
  useSyncToQueue(media);

  const handleDownload = useCallback(() => {
    // Will be implemented in Epic 4
    console.log('Starting download...');
  }, []);

  return {
    url,
    setUrl,
    validation,
    isValidating,
    media,
    isLoading,
    error,
    handleDownload,
  };
}
