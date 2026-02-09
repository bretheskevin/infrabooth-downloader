import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks';
import { validateUrl } from '@/lib/validation';
import type { ValidationResult } from '@/types/url';
import { UrlInput } from './UrlInput';
import { AuthPrompt } from './AuthPrompt';
import { ValidationFeedback } from './ValidationFeedback';

export function DownloadSection() {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const [url, setUrl] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  // Auto-dismiss success border after 2 seconds
  useEffect(() => {
    if (validationResult?.valid) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    setShowSuccess(false);
  }, [validationResult]);

  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);
    if (!newUrl) {
      setValidationResult(null);
    }
  }, []);

  // For border display: show success only while showSuccess is true, always show errors
  const displayResult = validationResult?.valid
    ? (showSuccess ? validationResult : null)
    : validationResult;

  return (
    <section className="space-y-4">
      <div className="relative">
        <UrlInput
          onUrlChange={handleUrlChange}
          disabled={!isSignedIn}
          isValidating={isValidating}
          validationResult={displayResult}
        />
        {!isSignedIn && <AuthPrompt />}
      </div>
      <ValidationFeedback
        result={validationResult}
        isValidating={isValidating}
      />
      {/* Preview will be added in Story 3.4 */}
    </section>
  );
}
