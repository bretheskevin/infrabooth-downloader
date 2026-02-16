import type { TFunction } from 'i18next';

export interface FetchError {
  code: string;
  message: string;
  hint?: string;
}

export function parseMediaError(err: unknown, t: TFunction): FetchError {
  const message = typeof err === 'string' ? err : (err as Error)?.message ?? '';

  if (message.includes('401') || message.includes('Unauthorized')) {
    return {
      code: 'AUTH_EXPIRED',
      message: t('errors.authExpired'),
      hint: t('errors.authExpiredHint'),
    };
  }

  if (message.includes('not found') || message.includes('Track not found') || message.includes('404')) {
    return {
      code: 'INVALID_URL',
      message: t('errors.trackNotFound'),
      hint: t('errors.trackNotFoundHint'),
    };
  }

  if (message.includes('region') || message.includes('GeoBlocked') || message.includes('403')) {
    return {
      code: 'GEO_BLOCKED',
      message: t('errors.geoBlocked'),
    };
  }

  if (message.includes('AuthRequired') || message.includes('Private content requires sign-in')) {
    return {
      code: 'AUTH_REQUIRED',
      message: t('errors.notSignedIn'),
    };
  }

  if (message.includes('TokenExpired')) {
    return {
      code: 'TOKEN_EXPIRED',
      message: t('errors.authExpired'),
      hint: t('errors.authExpiredHint'),
    };
  }

  return {
    code: 'FETCH_FAILED',
    message: t('errors.fetchFailed'),
  };
}
