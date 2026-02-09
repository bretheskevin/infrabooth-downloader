import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks';
import { validateUrl } from '@/lib/validation';
import type { ValidationResult } from '@/types/url';

interface UseUrlValidationReturn {
  result: ValidationResult | null;
  isValidating: boolean;
}

export function useUrlValidation(url: string): UseUrlValidationReturn {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debouncedUrl = useDebounce(url, 300);

  useEffect(() => {
    if (!debouncedUrl) {
      setResult(null);
      return;
    }

    setIsValidating(true);
    validateUrl(debouncedUrl)
      .then(setResult)
      .finally(() => setIsValidating(false));
  }, [debouncedUrl]);

  return { result, isValidating };
}
