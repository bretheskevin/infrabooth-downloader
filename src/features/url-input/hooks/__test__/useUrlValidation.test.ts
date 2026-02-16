import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUrlValidation } from '../useUrlValidation';
import { createQueryWrapper } from '@/test/queryWrapper';
import type { ValidationResult } from '@/bindings';

vi.mock('@/features/url-input/api/validation', () => ({
  validateUrl: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useDebounce: vi.fn((value: string) => value),
}));

import { validateUrl } from '@/features/url-input/api/validation';
import { useDebounce } from '@/hooks';

const mockValidateUrl = vi.mocked(validateUrl);
const mockUseDebounce = vi.mocked(useDebounce);

// Helper to create valid ValidationResult objects
const createValidResult = (urlType: 'track' | 'playlist'): ValidationResult => ({
  valid: true,
  urlType,
  error: null,
});

const createInvalidResult = (code: string, message: string, hint: string | null = null): ValidationResult => ({
  valid: false,
  urlType: null,
  error: { code, message, hint },
});

describe('useUrlValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDebounce.mockImplementation((value) => value);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return null result for empty URL', () => {
    const { result } = renderHook(() => useUrlValidation(''), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.result).toBeNull();
    expect(result.current.isValidating).toBe(false);
    expect(mockValidateUrl).not.toHaveBeenCalled();
  });

  it('should validate URL and return valid result', async () => {
    const validResult = createValidResult('playlist');
    mockValidateUrl.mockResolvedValue(validResult);

    const { result } = renderHook(
      () => useUrlValidation('https://soundcloud.com/artist/sets/playlist'),
      { wrapper: createQueryWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.result).toEqual(validResult);
    expect(mockValidateUrl).toHaveBeenCalledWith(
      'https://soundcloud.com/artist/sets/playlist'
    );
  });

  it('should validate URL and return invalid result', async () => {
    const invalidResult = createInvalidResult('INVALID_FORMAT', 'Invalid URL format');
    mockValidateUrl.mockResolvedValue(invalidResult);

    const { result } = renderHook(
      () => useUrlValidation('https://example.com/not-soundcloud'),
      { wrapper: createQueryWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.result).toEqual(invalidResult);
  });

  it('should reset result when URL becomes empty', async () => {
    const validResult = createValidResult('track');
    mockValidateUrl.mockResolvedValue(validResult);

    const { result, rerender } = renderHook(
      ({ url }) => useUrlValidation(url),
      {
        initialProps: { url: 'https://soundcloud.com/artist/track' },
        wrapper: createQueryWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.result).toEqual(validResult);
    });

    rerender({ url: '' });

    expect(result.current.result).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('should use debounced URL for validation', async () => {
    mockUseDebounce.mockReturnValue('debounced-url');
    mockValidateUrl.mockResolvedValue(createValidResult('track'));

    renderHook(() => useUrlValidation('original-url'), {
      wrapper: createQueryWrapper(),
    });

    expect(mockUseDebounce).toHaveBeenCalledWith('original-url', 300);

    await waitFor(() => {
      expect(mockValidateUrl).toHaveBeenCalledWith('debounced-url');
    });
  });

  it('should handle validation for track URL type', async () => {
    const trackResult = createValidResult('track');
    mockValidateUrl.mockResolvedValue(trackResult);

    const { result } = renderHook(
      () => useUrlValidation('https://soundcloud.com/artist/track-name'),
      { wrapper: createQueryWrapper() }
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
    const playlistResult = createValidResult('playlist');
    mockValidateUrl.mockResolvedValue(playlistResult);

    const { result } = renderHook(
      () => useUrlValidation('https://soundcloud.com/artist/sets/playlist'),
      { wrapper: createQueryWrapper() }
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
    const result1 = createValidResult('track');
    const result2 = createValidResult('playlist');

    mockValidateUrl.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

    const { result, rerender } = renderHook(
      ({ url }) => useUrlValidation(url),
      {
        initialProps: { url: 'https://soundcloud.com/artist/track' },
        wrapper: createQueryWrapper(),
      }
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
