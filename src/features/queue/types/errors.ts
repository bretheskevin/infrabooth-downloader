import type { ErrorResponse } from '@/bindings';

export type ErrorCode =
  | 'INVALID_URL'
  | 'GEO_BLOCKED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'DOWNLOAD_FAILED'
  | 'CONVERSION_FAILED'
  | 'AUTH_REQUIRED'
  | 'STREAM_RESOLUTION_FAILED'
  | 'CANCELLED'
  | 'AUTH_REFRESH_FAILED';

export type AppError = ErrorResponse & { code: ErrorCode };
