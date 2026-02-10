import type { ErrorCode, AppError } from '@/types/errors';
import type { TFunction } from 'i18next';

export const ERROR_CODE_TO_I18N_KEY: Record<ErrorCode, string> = {
  GEO_BLOCKED: 'errors.geoBlocked',
  RATE_LIMITED: 'errors.rateLimited',
  NETWORK_ERROR: 'errors.networkError',
  DOWNLOAD_FAILED: 'errors.downloadFailed',
  CONVERSION_FAILED: 'errors.conversionFailed',
  INVALID_URL: 'errors.invalidUrl',
  AUTH_REQUIRED: 'errors.notSignedIn',
};

export function getErrorMessage(code: ErrorCode, t: TFunction): string {
  return t(ERROR_CODE_TO_I18N_KEY[code]);
}

export function getErrorSeverity(code?: ErrorCode): 'warning' | 'error' {
  switch (code) {
    case 'GEO_BLOCKED':
    case 'RATE_LIMITED':
      return 'warning';
    case 'NETWORK_ERROR':
    case 'DOWNLOAD_FAILED':
    case 'CONVERSION_FAILED':
    case 'INVALID_URL':
    case 'AUTH_REQUIRED':
    default:
      return 'error';
  }
}

/**
 * Check if an error is a geo-blocked error.
 */
export function isGeoBlockedError(error?: AppError): boolean {
  return error?.code === 'GEO_BLOCKED';
}

/**
 * Get the user-friendly message for geo-blocked errors.
 */
export function getGeoBlockMessage(t: TFunction): string {
  return t('errors.geoBlocked');
}

/**
 * Get the detail message for geo-blocked errors.
 */
export function getGeoBlockDetail(t: TFunction): string {
  return t('errors.geoBlockedDetail');
}

/**
 * Get the no-retry message for geo-blocked errors.
 */
export function getGeoBlockNoRetry(t: TFunction): string {
  return t('errors.geoBlockedNoRetry');
}

/**
 * Patterns that indicate a track is unavailable (removed/private/deleted).
 */
const UNAVAILABILITY_PATTERNS = [
  'unavailable',
  'private',
  'removed',
  'deleted',
  '404',
  'not found',
  'does not exist',
  'no longer available',
] as const;

/**
 * Check if an error indicates the track is unavailable (removed/private/deleted).
 * This is detected by checking the DOWNLOAD_FAILED error code with specific message patterns.
 */
export function isUnavailableError(error?: AppError): boolean {
  if (!error) return false;
  if (error.code !== 'DOWNLOAD_FAILED') return false;

  const message = error.message?.toLowerCase() || '';
  return UNAVAILABILITY_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Get the user-friendly message for unavailable track errors.
 */
export function getUnavailableMessage(t: TFunction): string {
  return t('errors.trackUnavailable');
}

/**
 * Get the detail message for unavailable track errors.
 */
export function getUnavailableDetail(t: TFunction): string {
  return t('errors.trackUnavailableDetail');
}
