import { describe, it, expect } from 'vitest';
import { parseMediaError } from '../parseMediaError';
import type { TFunction } from 'i18next';

const mockT = ((key: string) => key) as TFunction;

describe('parseMediaError', () => {
  it('should detect rate limit from "Rate limited" message', () => {
    const result = parseMediaError('Rate limited by SoundCloud', mockT);
    expect(result.code).toBe('RATE_LIMITED');
    expect(result.message).toBe('errors.rateLimitedFetch');
  });

  it('should detect rate limit from "429" in message', () => {
    const result = parseMediaError('HTTP 429: Too Many Requests', mockT);
    expect(result.code).toBe('RATE_LIMITED');
  });

  it('should detect rate limit from "rate limit" in message', () => {
    const result = parseMediaError('rate limit exceeded', mockT);
    expect(result.code).toBe('RATE_LIMITED');
  });

  it('should detect 401 as AUTH_EXPIRED', () => {
    const result = parseMediaError('HTTP 401: Unauthorized', mockT);
    expect(result.code).toBe('AUTH_EXPIRED');
  });

  it('should detect track not found', () => {
    const result = parseMediaError('Track not found', mockT);
    expect(result.code).toBe('INVALID_URL');
  });

  it('should detect geo block from region message', () => {
    const result = parseMediaError('Unavailable in your region', mockT);
    expect(result.code).toBe('GEO_BLOCKED');
  });

  it('should detect auth required', () => {
    const result = parseMediaError('Private content requires sign-in', mockT);
    expect(result.code).toBe('AUTH_REQUIRED');
  });

  it('should fall back to FETCH_FAILED for unknown errors', () => {
    const result = parseMediaError('Something unexpected happened', mockT);
    expect(result.code).toBe('FETCH_FAILED');
  });

  it('should handle Error objects', () => {
    const result = parseMediaError(new Error('Rate limited by SoundCloud'), mockT);
    expect(result.code).toBe('RATE_LIMITED');
  });
});
