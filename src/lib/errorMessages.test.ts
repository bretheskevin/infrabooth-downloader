import { describe, it, expect } from 'vitest';
import { getErrorMessage, getErrorSeverity } from './errorMessages';
import type { TFunction } from 'i18next';

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
  });
});
