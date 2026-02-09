export type UrlType = 'playlist' | 'track';

export interface ValidationError {
  code: string;
  message: string;
  hint?: string;
}

export interface ValidationResult {
  valid: boolean;
  urlType?: UrlType;
  error?: ValidationError;
}
