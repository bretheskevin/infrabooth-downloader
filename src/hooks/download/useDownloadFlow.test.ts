import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownloadFlow } from './useDownloadFlow';
import type { ValidationResult } from '@/types/url';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

// Mock the composed hooks
const mockValidationResult = { result: null as ValidationResult | null, isValidating: false };
vi.mock('./useUrlValidation', () => ({
  useUrlValidation: vi.fn(() => mockValidationResult),
}));

const mockMediaFetchResult = { data: null as PlaylistInfo | TrackInfo | null, isLoading: false, error: null };
vi.mock('./useMediaFetch', () => ({
  useMediaFetch: vi.fn(() => mockMediaFetchResult),
}));

const mockSyncToQueue = vi.fn();
vi.mock('./useSyncToQueue', () => ({
  useSyncToQueue: (media: PlaylistInfo | TrackInfo | null) => mockSyncToQueue(media),
}));

import { useUrlValidation } from './useUrlValidation';
import { useMediaFetch } from './useMediaFetch';

const mockUseUrlValidation = vi.mocked(useUrlValidation);
const mockUseMediaFetch = vi.mocked(useMediaFetch);

const mockPlaylist: PlaylistInfo = {
  id: 123,
  title: 'Test Playlist',
  user: { username: 'TestUser' },
  artwork_url: 'https://example.com/art.jpg',
  track_count: 2,
  tracks: [
    { id: 1, title: 'Track 1', user: { username: 'Artist1' }, artwork_url: null, duration: 180000 },
  ],
};

describe('useDownloadFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUrlValidation.mockReturnValue({ result: null, isValidating: false });
    mockUseMediaFetch.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  it('should initialize with empty URL', () => {
    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.url).toBe('');
  });

  it('should update URL when setUrl is called', () => {
    const { result } = renderHook(() => useDownloadFlow());

    act(() => {
      result.current.setUrl('https://soundcloud.com/artist/track');
    });

    expect(result.current.url).toBe('https://soundcloud.com/artist/track');
  });

  it('should pass URL to useUrlValidation', () => {
    const { result } = renderHook(() => useDownloadFlow());

    act(() => {
      result.current.setUrl('https://soundcloud.com/artist/track');
    });

    expect(mockUseUrlValidation).toHaveBeenCalledWith('https://soundcloud.com/artist/track');
  });

  it('should pass URL and validation to useMediaFetch', () => {
    const validationResult: ValidationResult = { valid: true, urlType: 'track' };
    mockUseUrlValidation.mockReturnValue({ result: validationResult, isValidating: false });

    const { result } = renderHook(() => useDownloadFlow());

    act(() => {
      result.current.setUrl('https://soundcloud.com/artist/track');
    });

    expect(mockUseMediaFetch).toHaveBeenCalledWith(
      'https://soundcloud.com/artist/track',
      validationResult
    );
  });

  it('should expose validation result from useUrlValidation', () => {
    const validationResult: ValidationResult = { valid: true, urlType: 'playlist' };
    mockUseUrlValidation.mockReturnValue({ result: validationResult, isValidating: true });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.validation).toEqual(validationResult);
    expect(result.current.isValidating).toBe(true);
  });

  it('should expose media data from useMediaFetch', () => {
    mockUseMediaFetch.mockReturnValue({ data: mockPlaylist, isLoading: false, error: null });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.media).toEqual(mockPlaylist);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should expose loading state from useMediaFetch', () => {
    mockUseMediaFetch.mockReturnValue({ data: null, isLoading: true, error: null });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.isLoading).toBe(true);
  });

  it('should expose error from useMediaFetch', () => {
    const fetchError = { code: 'FETCH_FAILED', message: 'Failed to fetch' };
    mockUseMediaFetch.mockReturnValue({ data: null, isLoading: false, error: fetchError });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.error).toEqual(fetchError);
  });

  it('should pass media to useSyncToQueue', () => {
    mockUseMediaFetch.mockReturnValue({ data: mockPlaylist, isLoading: false, error: null });

    renderHook(() => useDownloadFlow());

    expect(mockSyncToQueue).toHaveBeenCalledWith(mockPlaylist);
  });

  it('should provide handleDownload function', () => {
    const { result } = renderHook(() => useDownloadFlow());

    expect(typeof result.current.handleDownload).toBe('function');
  });

  it('should call console.log when handleDownload is called', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { result } = renderHook(() => useDownloadFlow());

    act(() => {
      result.current.handleDownload();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Starting download...');
    consoleSpy.mockRestore();
  });
});
