import type { ErrorCode } from '@/types/errors';
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
