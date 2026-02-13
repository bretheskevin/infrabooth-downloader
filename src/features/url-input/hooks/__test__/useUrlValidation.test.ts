import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUrlValidation } from '../useUrlValidation';

// Mock the validation module
vi.mock('@/features/url-input/api/validation', () => ({
  validateUrl: vi.fn(),
}));

// Mock useDebounce to make tests synchronous
vi.mock('@/hooks', () => ({
  useDebounce: vi.fn((value: string) => value),
}));

import { validateUrl } from '@/features/url-input/api/validation';
import { useDebounce } from '@/hooks';

const mockValidateUrl = vi.mocked(validateUrl);
const mockUseDebounce = vi.mocked(useDebounce);

describe('useUrlValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDebounce.mockImplementation((value) => value);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return null result for empty URL', () => {
    const { result } = renderHook(() => useUrlValidation(''));

    expect(result.current.result).toBeNull();
    expect(result.current.isValidating).toBe(false);
    expect(mockValidateUrl).not.toHaveBeenCalled();
  });

  it('should validate URL and return valid result', async () => {
    const validResult = { valid: true as const, urlType: 'playlist' as const };
    mockValidateUrl.mockResolvedValue(validResult);

    const { result } = renderHook(() =>
      useUrlValidation('https://soundcloud.com/artist/sets/playlist')
    );

    // Should be validating initially
    expect(result.current.isValidating).toBe(true);

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.result).toEqual(validResult);
    expect(mockValidateUrl).toHaveBeenCalledWith(
      'https://soundcloud.com/artist/sets/playlist'
    );
  });

  it('should validate URL and return invalid result', async () => {
    const invalidResult = {
      valid: false as const,
      error: { code: 'INVALID_FORMAT', message: 'Invalid URL format' },
    };
    mockValidateUrl.mockResolvedValue(invalidResult);

    const { result } = renderHook(() =>
      useUrlValidation('https://example.com/not-soundcloud')
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.result).toEqual(invalidResult);
  });

  it('should reset result when URL becomes empty', async () => {
    const validResult = { valid: true as const, urlType: 'track' as const };
    mockValidateUrl.mockResolvedValue(validResult);

    const { result, rerender } = renderHook(
      ({ url }) => useUrlValidation(url),
      { initialProps: { url: 'https://soundcloud.com/artist/track' } }
    );

    await waitFor(() => {
      expect(result.current.result).toEqual(validResult);
    });

    // Clear URL
    rerender({ url: '' });

    expect(result.current.result).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('should use debounced URL for validation', () => {
    mockUseDebounce.mockReturnValue('debounced-url');
    mockValidateUrl.mockResolvedValue({ valid: true, urlType: 'track' });

    renderHook(() => useUrlValidation('original-url'));

    expect(mockUseDebounce).toHaveBeenCalledWith('original-url', 300);
    expect(mockValidateUrl).toHaveBeenCalledWith('debounced-url');
  });

  it('should handle validation for track URL type', async () => {
    const trackResult = { valid: true as const, urlType: 'track' as const };
    mockValidateUrl.mockResolvedValue(trackResult);

    const { result } = renderHook(() =>
      useUrlValidation('https://soundcloud.com/artist/track-name')
    );

    await waitFor(() => {
      expect(result.current.result).toEqual(trackResult);
    });

    expect(result.current.result?.valid).toBe(true);
    if (result.current.result?.valid) {
      expect(result.current.result.urlType).toBe('track');
    }
  });

  it('should handle validation for playlist URL type', async () => {
    const playlistResult = { valid: true as const, urlType: 'playlist' as const };
    mockValidateUrl.mockResolvedValue(playlistResult);

    const { result } = renderHook(() =>
      useUrlValidation('https://soundcloud.com/artist/sets/playlist')
    );

    await waitFor(() => {
      expect(result.current.result).toEqual(playlistResult);
    });

    expect(result.current.result?.valid).toBe(true);
    if (result.current.result?.valid) {
      expect(result.current.result.urlType).toBe('playlist');
    }
  });

  it('should revalidate when URL changes', async () => {
    const result1 = { valid: true as const, urlType: 'track' as const };
    const result2 = { valid: true as const, urlType: 'playlist' as const };

    mockValidateUrl.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

    const { result, rerender } = renderHook(
      ({ url }) => useUrlValidation(url),
      { initialProps: { url: 'https://soundcloud.com/artist/track' } }
    );

    await waitFor(() => {
      expect(result.current.result).toEqual(result1);
    });

    rerender({ url: 'https://soundcloud.com/artist/sets/playlist' });

    await waitFor(() => {
      expect(result.current.result).toEqual(result2);
    });

    expect(mockValidateUrl).toHaveBeenCalledTimes(2);
  });
});
