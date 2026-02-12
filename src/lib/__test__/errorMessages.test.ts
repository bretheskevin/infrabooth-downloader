import { describe, it, expect } from 'vitest';
import {
  getErrorMessage,
  getErrorSeverity,
  isGeoBlockedError,
  getGeoBlockMessage,
  getGeoBlockDetail,
  getGeoBlockNoRetry,
  isUnavailableError,
  getUnavailableMessage,
  getUnavailableDetail,
} from '../errorMessages';
import type { TFunction } from 'i18next';
import type { AppError } from '@/features/download/types/errors';

describe('errorMessages', () => {
  describe('getErrorMessage', () => {
    const mockT = ((key: string) => {
      const translations: Record<string, string> = {
        'errors.geoBlocked': 'Unavailable in your region',
        'errors.rateLimited': 'Rate limited - will retry',
        'errors.networkError': 'Network error',
        'errors.downloadFailed': 'Download failed',
        'errors.conversionFailed': 'Conversion failed',
        'errors.invalidUrl': 'Invalid URL',
        'errors.notSignedIn': 'Please sign in',
      };
      return translations[key] || key;
    }) as TFunction;

    it('should return correct message for GEO_BLOCKED', () => {
      expect(getErrorMessage('GEO_BLOCKED', mockT)).toBe('Unavailable in your region');
    });

    it('should return correct message for RATE_LIMITED', () => {
      expect(getErrorMessage('RATE_LIMITED', mockT)).toBe('Rate limited - will retry');
    });

    it('should return correct message for NETWORK_ERROR', () => {
      expect(getErrorMessage('NETWORK_ERROR', mockT)).toBe('Network error');
    });

    it('should return correct message for DOWNLOAD_FAILED', () => {
      expect(getErrorMessage('DOWNLOAD_FAILED', mockT)).toBe('Download failed');
    });

    it('should return correct message for CONVERSION_FAILED', () => {
      expect(getErrorMessage('CONVERSION_FAILED', mockT)).toBe('Conversion failed');
    });

    it('should return correct message for INVALID_URL', () => {
      expect(getErrorMessage('INVALID_URL', mockT)).toBe('Invalid URL');
    });

    it('should return correct message for AUTH_REQUIRED', () => {
      expect(getErrorMessage('AUTH_REQUIRED', mockT)).toBe('Please sign in');
    });
  });

  describe('getErrorSeverity', () => {
    it('should return warning for GEO_BLOCKED', () => {
      expect(getErrorSeverity('GEO_BLOCKED')).toBe('warning');
    });

    it('should return warning for RATE_LIMITED', () => {
      expect(getErrorSeverity('RATE_LIMITED')).toBe('warning');
    });

    it('should return error for NETWORK_ERROR', () => {
      expect(getErrorSeverity('NETWORK_ERROR')).toBe('error');
    });

    it('should return error for DOWNLOAD_FAILED', () => {
      expect(getErrorSeverity('DOWNLOAD_FAILED')).toBe('error');
    });

    it('should return error for CONVERSION_FAILED', () => {
      expect(getErrorSeverity('CONVERSION_FAILED')).toBe('error');
    });

    it('should return error for INVALID_URL', () => {
      expect(getErrorSeverity('INVALID_URL')).toBe('error');
    });

    it('should return error for AUTH_REQUIRED', () => {
      expect(getErrorSeverity('AUTH_REQUIRED')).toBe('error');
    });

    it('should return error for undefined', () => {
      expect(getErrorSeverity(undefined)).toBe('error');
    });
  });

  describe('isGeoBlockedError', () => {
    it('should return true for GEO_BLOCKED error', () => {
      const error: AppError = { code: 'GEO_BLOCKED', message: 'Geo blocked' };
      expect(isGeoBlockedError(error)).toBe(true);
    });

    it('should return false for DOWNLOAD_FAILED error', () => {
      const error: AppError = { code: 'DOWNLOAD_FAILED', message: 'Download failed' };
      expect(isGeoBlockedError(error)).toBe(false);
    });

    it('should return false for NETWORK_ERROR error', () => {
      const error: AppError = { code: 'NETWORK_ERROR', message: 'Network error' };
      expect(isGeoBlockedError(error)).toBe(false);
    });

    it('should return false for RATE_LIMITED error', () => {
      const error: AppError = { code: 'RATE_LIMITED', message: 'Rate limited' };
      expect(isGeoBlockedError(error)).toBe(false);
    });

    it('should return false for undefined error', () => {
      expect(isGeoBlockedError(undefined)).toBe(false);
    });
  });

  describe('getGeoBlockMessage', () => {
    const mockT = ((key: string) => {
      const translations: Record<string, string> = {
        'errors.geoBlocked': 'Unavailable in your region',
      };
      return translations[key] || key;
    }) as TFunction;

    it('should return the geo block message', () => {
      expect(getGeoBlockMessage(mockT)).toBe('Unavailable in your region');
    });
  });

  describe('getGeoBlockDetail', () => {
    const mockT = ((key: string) => {
      const translations: Record<string, string> = {
        'errors.geoBlockedDetail': 'Geographic restriction by rights holder',
      };
      return translations[key] || key;
    }) as TFunction;

    it('should return the geo block detail message', () => {
      expect(getGeoBlockDetail(mockT)).toBe('Geographic restriction by rights holder');
    });
  });

  describe('getGeoBlockNoRetry', () => {
    const mockT = ((key: string) => {
      const translations: Record<string, string> = {
        'errors.geoBlockedNoRetry': 'This track will not retry automatically',
      };
      return translations[key] || key;
    }) as TFunction;

    it('should return the no retry message', () => {
      expect(getGeoBlockNoRetry(mockT)).toBe('This track will not retry automatically');
    });
  });

  describe('isUnavailableError', () => {
    it('should return true for DOWNLOAD_FAILED with "unavailable" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'Track unavailable - may have been removed',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for DOWNLOAD_FAILED with "private" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'Private video. Sign in if you have access',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for DOWNLOAD_FAILED with "removed" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'This track was removed by the uploader',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for DOWNLOAD_FAILED with "deleted" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'Content has been deleted',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for DOWNLOAD_FAILED with "404" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'HTTP Error 404: Page not found',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for DOWNLOAD_FAILED with "not found" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'Track not found',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for DOWNLOAD_FAILED with "does not exist" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'This page does not exist',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for DOWNLOAD_FAILED with "no longer available" in message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'This track is no longer available',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return true for case-insensitive pattern matching', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'VIDEO UNAVAILABLE',
      };
      expect(isUnavailableError(error)).toBe(true);
    });

    it('should return false for GEO_BLOCKED error', () => {
      const error: AppError = {
        code: 'GEO_BLOCKED',
        message: 'Not available in your region',
      };
      expect(isUnavailableError(error)).toBe(false);
    });

    it('should return false for NETWORK_ERROR', () => {
      const error: AppError = {
        code: 'NETWORK_ERROR',
        message: 'Connection timeout',
      };
      expect(isUnavailableError(error)).toBe(false);
    });

    it('should return false for CONVERSION_FAILED', () => {
      const error: AppError = {
        code: 'CONVERSION_FAILED',
        message: 'FFmpeg error',
      };
      expect(isUnavailableError(error)).toBe(false);
    });

    it('should return false for DOWNLOAD_FAILED without unavailability patterns', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: 'Connection timed out',
      };
      expect(isUnavailableError(error)).toBe(false);
    });

    it('should return false for undefined error', () => {
      expect(isUnavailableError(undefined)).toBe(false);
    });

    it('should return false for error with undefined message', () => {
      const error = {
        code: 'DOWNLOAD_FAILED',
        message: undefined,
      } as unknown as AppError;
      expect(isUnavailableError(error)).toBe(false);
    });

    it('should return false for error with empty message', () => {
      const error: AppError = {
        code: 'DOWNLOAD_FAILED',
        message: '',
      };
      expect(isUnavailableError(error)).toBe(false);
    });
  });

  describe('getUnavailableMessage', () => {
    const mockT = ((key: string) => {
      const translations: Record<string, string> = {
        'errors.trackUnavailable': 'Track unavailable',
      };
      return translations[key] || key;
    }) as TFunction;

    it('should return the unavailable message', () => {
      expect(getUnavailableMessage(mockT)).toBe('Track unavailable');
    });
  });

  describe('getUnavailableDetail', () => {
    const mockT = ((key: string) => {
      const translations: Record<string, string> = {
        'errors.trackUnavailableDetail': 'This track may have been removed or made private',
      };
      return translations[key] || key;
    }) as TFunction;

    it('should return the unavailable detail message', () => {
      expect(getUnavailableDetail(mockT)).toBe('This track may have been removed or made private');
    });
  });
});
