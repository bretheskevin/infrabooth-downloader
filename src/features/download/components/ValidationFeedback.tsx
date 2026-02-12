import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ValidationResult } from '@/features/download/types/url';

interface ValidationFeedbackProps {
  result: ValidationResult | null;
  isValidating: boolean;
}

export function ValidationFeedback({ result, isValidating }: ValidationFeedbackProps) {
  const { t } = useTranslation();

  if (isValidating) {
    return null; // Loading state is on input border
  }

  if (!result) {
    return null;
  }

  if (result.valid) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-success mt-2"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {result.urlType === 'playlist'
            ? t('download.validPlaylist')
            : t('download.validTrack')}
        </span>
      </div>
    );
  }

  // Error state
  return (
    <div
      className="mt-2 space-y-1"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{result.error?.message}</span>
      </div>
      {result.error?.hint && (
        <p className="text-sm text-muted-foreground pl-6">
          {result.error.hint}
        </p>
      )}
    </div>
  );
}
