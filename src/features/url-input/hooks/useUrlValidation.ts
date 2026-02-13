import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks';
import { validateUrl } from '@/features/url-input/api/validation';
import type { ValidationResult } from '@/features/url-input/types/url';

interface UseUrlValidationReturn {
  result: ValidationResult | null;
  isValidating: boolean;
}

export function useUrlValidation(url: string): UseUrlValidationReturn {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debouncedUrl = useDebounce(url, 300);

  // Immediately clear when URL becomes empty (bypass debounce)
  useEffect(() => {
    if (!url) {
      setResult(null);
      setIsValidating(false);
    }
  }, [url]);

  useEffect(() => {
    let isCancelled = false;

    if (!debouncedUrl) {
      setResult(null);
      return;
    }

    setIsValidating(true);
    validateUrl(debouncedUrl)
      .then((res) => {
        if (isCancelled) return;
        setResult(res);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsValidating(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedUrl]);

  return { result, isValidating };
}
