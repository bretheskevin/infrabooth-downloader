export type ErrorCode =
  | 'INVALID_URL'
  | 'GEO_BLOCKED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'DOWNLOAD_FAILED'
  | 'CONVERSION_FAILED'
  | 'AUTH_REQUIRED';

export interface AppError {
  code: ErrorCode;
  message: string;
}
