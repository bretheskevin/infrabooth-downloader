import { describe, it, expect } from 'vitest';
import { getErrorMessageKey } from '../getErrorMessageKey';

describe('getErrorMessageKey', () => {
  it('returns authExpired for Authentication required errors', () => {
    expect(getErrorMessageKey(new Error('Authentication required'))).toBe('errors.authExpired');
  });

  it('returns authExpired for AuthRequired errors', () => {
    expect(getErrorMessageKey(new Error('AuthRequired'))).toBe('errors.authExpired');
  });

  it('returns rateLimited for Rate limited errors', () => {
    expect(getErrorMessageKey(new Error('Rate limited'))).toBe('library.rateLimited');
  });

  it('returns rateLimited for RateLimited errors', () => {
    expect(getErrorMessageKey(new Error('RateLimited'))).toBe('library.rateLimited');
  });

  it('returns default key for unknown errors', () => {
    expect(getErrorMessageKey(new Error('Something broke'))).toBe('common.error');
  });

  it('uses custom default key when provided', () => {
    expect(getErrorMessageKey(new Error('Something broke'), 'custom.key')).toBe('custom.key');
  });
});
