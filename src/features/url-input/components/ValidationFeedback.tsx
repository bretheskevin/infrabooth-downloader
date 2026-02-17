import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ValidationResult } from '@/features/url-input/types/url';

interface ValidationFeedbackProps {
  result: ValidationResult | null;
  isValidating: boolean;
  /** Hide short link success message when media is loaded or loading */
  hideWhenMediaLoaded?: boolean;
}

/**
 * Maps backend error codes to translation keys.
 * The backend returns error codes which we translate on the frontend.
 */
const ERROR_CODE_TO_MESSAGE_KEY: Record<string, string> = {
  INVALID_URL: 'errors.invalidUrl',
  INVALID_FORMAT: 'errors.invalidUrlFormat',
  PROFILE_URL: 'errors.profileNotSupported',
};

const ERROR_CODE_TO_HINT_KEY: Record<string, string> = {
  INVALID_URL: 'errors.invalidUrlHint',
  INVALID_FORMAT: 'errors.invalidUrlHint',
  PROFILE_URL: 'errors.profileNotSupportedHint',
};

function getTranslatedError(
  code: string | undefined,
  t: (key: string) => string
): { message: string; hint: string | null } {
  if (!code) {
    return { message: t('errors.invalidUrlFormat'), hint: null };
  }

  const messageKey = ERROR_CODE_TO_MESSAGE_KEY[code];
  const hintKey = ERROR_CODE_TO_HINT_KEY[code];

  return {
    message: messageKey ? t(messageKey) : t('errors.invalidUrlFormat'),
    hint: hintKey ? t(hintKey) : null,
  };
}

export function ValidationFeedback({ result, isValidating, hideWhenMediaLoaded }: ValidationFeedbackProps) {
  const { t } = useTranslation();

  if (isValidating) {
    return null; // Loading state is on input border
  }

  if (!result) {
    return null;
  }

  if (result.valid) {
    // Determine the success message based on URL type
    // Short links (on.soundcloud.com) have urlType = null
    const isShortLink = result.urlType === null;

    // Hide short link message once media is loaded/loading
    if (isShortLink && hideWhenMediaLoaded) {
      return null;
    }

    const getSuccessMessage = () => {
      if (result.urlType === 'playlist') return t('download.validPlaylist');
      if (result.urlType === 'track') return t('download.validTrack');
      return t('download.validShortLink'); // Short links have no type yet
    };

    return (
      <div
        className="flex items-center gap-2 text-sm text-success mt-2"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>{getSuccessMessage()}</span>
      </div>
    );
  }

  // Error state - translate based on error code
  const { message, hint } = getTranslatedError(result.error?.code, t);

  return (
    <div
      className="mt-2 space-y-1"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{message}</span>
      </div>
      {hint && (
        <p className="text-sm text-muted-foreground pl-6">
          {hint}
        </p>
      )}
    </div>
  );
}
