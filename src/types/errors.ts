export type ErrorCode =
  | 'INVALID_URL'
  | 'GEO_BLOCKED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'DOWNLOAD_FAILED'
  | 'CONVERSION_FAILED';

export interface AppError {
  code: ErrorCode;
  message: string;
}
