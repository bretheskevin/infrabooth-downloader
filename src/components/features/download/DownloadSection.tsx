import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks';
import { validateUrl } from '@/lib/validation';
import type { ValidationResult } from '@/types/url';
import { UrlInput } from './UrlInput';
import { AuthPrompt } from './AuthPrompt';

export function DownloadSection() {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const [url, setUrl] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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

  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);
  }, []);

  return (
    <section className="space-y-4">
      <div className="relative">
        <UrlInput
          onUrlChange={handleUrlChange}
          disabled={!isSignedIn}
          isValidating={isValidating}
          validationResult={validationResult}
        />
        {!isSignedIn && <AuthPrompt />}
      </div>
      {/* Preview and progress will be added in later stories */}
    </section>
  );
}
