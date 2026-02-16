import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMediaFetch } from '../useMediaFetch';
import { createQueryWrapper } from '@/test/queryWrapper';
import type { ValidationResult } from '@/features/url-input/types/url';

vi.mock('@/features/url-input/api/playlist', () => ({
  fetchPlaylistInfo: vi.fn(),
  fetchTrackInfo: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { fetchPlaylistInfo, fetchTrackInfo } from '@/features/url-input/api/playlist';

const mockFetchPlaylistInfo = vi.mocked(fetchPlaylistInfo);
const mockFetchTrackInfo = vi.mocked(fetchTrackInfo);

const mockPlaylist = {
  id: 123,
  title: 'Test Playlist',
  user: { username: 'TestUser' },
  artwork_url: 'https://example.com/art.jpg',
  track_count: 5,
  tracks: [
    { id: 1, title: 'Track 1', user: { username: 'Artist1' }, artwork_url: null, duration: 180000 },
  ],
};

const mockTrack = {
  id: 456,
  title: 'Test Track',
  user: { username: 'TestArtist' },
  artwork_url: 'https://example.com/track-art.jpg',
  duration: 240000,
};

const validTrackValidation: ValidationResult = { valid: true, urlType: 'track', error: null };
const validPlaylistValidation: ValidationResult = { valid: true, urlType: 'playlist', error: null };
const invalidValidation: ValidationResult = { valid: false, urlType: null, error: { code: 'INVALID', message: 'Invalid', hint: null } };

describe('useMediaFetch', () => {
  beforeEach(() => {
    mockFetchPlaylistInfo.mockReset();
    mockFetchTrackInfo.mockReset();
    mockFetchPlaylistInfo.mockResolvedValue(mockPlaylist);
    mockFetchTrackInfo.mockResolvedValue(mockTrack);
  });

  describe('when validation is null', () => {
    it('should return null data and no loading', () => {
      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: null },
          wrapper: createQueryWrapper(),
        }
      );

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should not call fetch functions', () => {
      renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: null },
          wrapper: createQueryWrapper(),
        }
      );

      expect(mockFetchPlaylistInfo).not.toHaveBeenCalled();
      expect(mockFetchTrackInfo).not.toHaveBeenCalled();
    });
  });

  describe('when validation is invalid', () => {
    it('should return null data and no loading', () => {
      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://example.com', validation: invalidValidation },
          wrapper: createQueryWrapper(),
        }
      );

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('when validation is valid for playlist', () => {
    it('should fetch playlist info', async () => {
      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/sets/playlist', validation: validPlaylistValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockPlaylist);
      expect(result.current.error).toBeNull();
      expect(mockFetchPlaylistInfo).toHaveBeenCalledWith(
        'https://soundcloud.com/artist/sets/playlist'
      );
      expect(mockFetchTrackInfo).not.toHaveBeenCalled();
    });
  });

  describe('when validation is valid for track', () => {
    it('should fetch track info', async () => {
      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track-name', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTrack);
      expect(result.current.error).toBeNull();
      expect(mockFetchTrackInfo).toHaveBeenCalledWith(
        'https://soundcloud.com/artist/track-name'
      );
      expect(mockFetchPlaylistInfo).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should map "not found" error to INVALID_URL', async () => {
      mockFetchTrackInfo.mockRejectedValue(new Error('Track not found'));

      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: 'INVALID_URL',
        message: 'errors.trackNotFound',
        hint: 'errors.trackNotFoundHint',
      });
      expect(result.current.data).toBeNull();
    });

    it('should map "region" error to GEO_BLOCKED', async () => {
      mockFetchTrackInfo.mockRejectedValue(
        new Error('Content not available in your region')
      );

      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: 'GEO_BLOCKED',
        message: 'errors.geoBlocked',
      });
    });

    it('should map "GeoBlocked" error to GEO_BLOCKED', async () => {
      mockFetchTrackInfo.mockRejectedValue(new Error('GeoBlocked'));

      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: 'GEO_BLOCKED',
        message: 'errors.geoBlocked',
      });
    });

    it('should map unknown error to FETCH_FAILED', async () => {
      mockFetchTrackInfo.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: 'FETCH_FAILED',
        message: 'errors.fetchFailed',
      });
    });

    it('should handle Tauri string errors (not Error objects)', async () => {
      mockFetchTrackInfo.mockRejectedValue('HTTP 401 Unauthorized: session expired');

      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: 'AUTH_EXPIRED',
        message: 'errors.authExpired',
        hint: 'errors.authExpiredHint',
      });
    });

    it('should map 401 error to AUTH_EXPIRED', async () => {
      mockFetchTrackInfo.mockRejectedValue(new Error('HTTP 401 Unauthorized'));

      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: 'AUTH_EXPIRED',
        message: 'errors.authExpired',
        hint: 'errors.authExpiredHint',
      });
    });

    it('should map AuthRequired error to AUTH_REQUIRED', async () => {
      mockFetchTrackInfo.mockRejectedValue('Private content requires sign-in');

      const { result } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: 'AUTH_REQUIRED',
        message: 'errors.notSignedIn',
      });
    });
  });

  describe('when validation changes', () => {
    it('should clear data when validation becomes invalid', async () => {
      const { result, rerender } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockTrack);
      });

      rerender({ url: 'https://invalid.com', validation: invalidValidation });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should clear previous error when fetching new URL', async () => {
      mockFetchTrackInfo
        .mockRejectedValueOnce(new Error('Track not found'))
        .mockResolvedValueOnce(mockTrack);

      const { result, rerender } = renderHook(
        ({ url, validation }) => useMediaFetch(url, validation),
        {
          initialProps: { url: 'https://soundcloud.com/artist/bad-track', validation: validTrackValidation },
          wrapper: createQueryWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      rerender({ url: 'https://soundcloud.com/artist/good-track', validation: validTrackValidation });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockTrack);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
