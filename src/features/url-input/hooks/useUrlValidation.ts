import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks';
import { validateUrl, type ValidationResult } from '@/features/url-input/api/validation';

interface UseUrlValidationReturn {
  result: ValidationResult | null;
  isValidating: boolean;
}

export function useUrlValidation(url: string): UseUrlValidationReturn {
  const debouncedUrl = useDebounce(url, 300);
  const [immediatelyClear, setImmediatelyClear] = useState(false);

  useEffect(() => {
    if (!url) {
      setImmediatelyClear(true);
    } else {
      setImmediatelyClear(false);
    }
  }, [url]);

  const { data, isFetching } = useQuery({
    queryKey: ['url-validation', debouncedUrl],
    queryFn: () => validateUrl(debouncedUrl),
    enabled: !!debouncedUrl && !immediatelyClear,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  if (immediatelyClear || !url) {
    return { result: null, isValidating: false };
  }

  return {
    result: data ?? null,
    isValidating: isFetching,
  };
}
