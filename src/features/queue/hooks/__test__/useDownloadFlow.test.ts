import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownloadFlow } from '../useDownloadFlow';
import type { ValidationResult, PlaylistInfo, TrackInfo, FetchError } from '@/features/url-input';

const mockValidationResult = {
  result: null as ValidationResult | null,
  isValidating: false,
};
vi.mock('@/features/url-input', async () => {
  const actual = await vi.importActual('@/features/url-input');
  return {
    ...actual,
    useUrlValidation: vi.fn(() => mockValidationResult),
  };
});

const mockMediaInfoFetcherState = {
  mediaInfo: null as PlaylistInfo | TrackInfo | null,
  validatedUrl: null as string | null,
  validation: null as ValidationResult | null,
  isLoading: false,
  error: null as FetchError | null,
  fetchInfo: vi.fn(),
  clear: vi.fn(),
};
vi.mock('../useMediaInfoFetcher', () => ({
  useMediaInfoFetcher: vi.fn(() => mockMediaInfoFetcherState),
}));

const mockInitiateDownload = vi.fn();
vi.mock('../useDownloadInitiator', () => ({
  useDownloadInitiator: vi.fn(() => ({
    initiateDownload: mockInitiateDownload,
  })),
}));

const mockSyncToQueue = vi.fn();
vi.mock('../useSyncToQueue', () => ({
  useSyncToQueue: (media: PlaylistInfo | TrackInfo | null) => mockSyncToQueue(media),
}));

const mockQueueStoreState = { isProcessing: false, isComplete: false };

vi.mock('@/features/queue/store', () => {
  const mockSelector = vi.fn((selector: (state: { isProcessing: boolean; isComplete: boolean }) => unknown) => {
    return selector(mockQueueStoreState);
  });
  return {
    useQueueStore: Object.assign(mockSelector, {
      getState: vi.fn(() => ({})),
    }),
  };
});

import { useUrlValidation } from '@/features/url-input';
import { useMediaInfoFetcher } from '../useMediaInfoFetcher';

const mockUseUrlValidation = vi.mocked(useUrlValidation);
const mockUseMediaInfoFetcher = vi.mocked(useMediaInfoFetcher);

const mockPlaylist: PlaylistInfo = {
  id: 123,
  title: 'Test Playlist',
  user: { id: 0, username: 'TestUser', avatar_url: null },
  artwork_url: 'https://example.com/art.jpg',
  track_count: 2,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      user: { id: 0, username: 'Artist1', avatar_url: null },
      artwork_url: null,
      duration: 180000,
      permalink_url: '',
      waveform_url: null,
      downloadable: false,
      download_url: null,
    },
  ],
};

const mockTrack: TrackInfo = {
  id: 456,
  title: 'Single Track',
  user: { id: 0, username: 'Artist2', avatar_url: null },
  artwork_url: 'https://example.com/single.jpg',
  duration: 240000,
  permalink_url: '',
  waveform_url: null,
  downloadable: false,
  download_url: null,
};

describe('useDownloadFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueStoreState.isProcessing = false;
    mockQueueStoreState.isComplete = false;
    mockUseUrlValidation.mockReturnValue({ result: null, isValidating: false });
    mockMediaInfoFetcherState.mediaInfo = null;
    mockMediaInfoFetcherState.validatedUrl = null;
    mockMediaInfoFetcherState.validation = null;
    mockMediaInfoFetcherState.isLoading = false;
    mockMediaInfoFetcherState.error = null;
    mockMediaInfoFetcherState.fetchInfo = vi.fn();
    mockMediaInfoFetcherState.clear = vi.fn();
    mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);
    mockInitiateDownload.mockResolvedValue(undefined);
  });

  it('should initialize with empty URL', () => {
    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.url).toBe('');
  });

  it('should initialize with isPending as false', () => {
    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.isPending).toBe(false);
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

  it('should call fetchInfo when URL is valid', () => {
    const validationResult: ValidationResult = { valid: true, urlType: 'track', error: null };
    mockUseUrlValidation.mockReturnValue({
      result: validationResult,
      isValidating: false,
    });

    const { result } = renderHook(() => useDownloadFlow());

    act(() => {
      result.current.setUrl('https://soundcloud.com/artist/track');
    });

    expect(mockMediaInfoFetcherState.fetchInfo).toHaveBeenCalledWith('https://soundcloud.com/artist/track');
  });

  it('should expose validation result from useUrlValidation', () => {
    const validationResult: ValidationResult = {
      valid: true,
      urlType: 'playlist',
      error: null,
    };
    mockUseUrlValidation.mockReturnValue({
      result: validationResult,
      isValidating: true,
    });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.validation).toEqual(validationResult);
    expect(result.current.isValidating).toBe(true);
  });

  it('should expose media data from useMediaInfoFetcher', () => {
    mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
    mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.media).toEqual(mockPlaylist);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should expose loading state from useMediaInfoFetcher', () => {
    mockMediaInfoFetcherState.isLoading = true;
    mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.isLoading).toBe(true);
  });

  it('should expose error from useMediaInfoFetcher', () => {
    const fetchError: FetchError = { code: 'FETCH_FAILED', message: 'Failed to fetch' };
    mockMediaInfoFetcherState.error = fetchError;
    mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.error).toEqual(fetchError);
  });

  it('should pass media to useSyncToQueue', () => {
    mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
    mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

    renderHook(() => useDownloadFlow());

    expect(mockSyncToQueue).toHaveBeenCalledWith(mockPlaylist);
  });

  it('should provide handleDownload function', () => {
    const { result } = renderHook(() => useDownloadFlow());

    expect(typeof result.current.handleDownload).toBe('function');
  });

  describe('handleDownload', () => {
    it('should not call initiateDownload when media is null', async () => {
      mockMediaInfoFetcherState.mediaInfo = null;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockInitiateDownload).not.toHaveBeenCalled();
    });

    it('should call initiateDownload with media when available', async () => {
      mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockInitiateDownload).toHaveBeenCalledWith(mockPlaylist, undefined);
    });

    it('should pass outputDirOverride to initiateDownload', async () => {
      mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload('/custom/path');
      });

      expect(mockInitiateDownload).toHaveBeenCalledWith(mockPlaylist, '/custom/path');
    });

    it('should work with single track media', async () => {
      mockMediaInfoFetcherState.mediaInfo = mockTrack;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockInitiateDownload).toHaveBeenCalledWith(mockTrack, undefined);
    });

    it('should set isPending to true when download starts', async () => {
      mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result } = renderHook(() => useDownloadFlow());

      expect(result.current.isPending).toBe(false);

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(true);
    });

    it('should not set isPending when media is null', async () => {
      mockMediaInfoFetcherState.mediaInfo = null;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(false);
    });

    it('should reset isPending on download error', async () => {
      mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);
      mockInitiateDownload.mockRejectedValueOnce(new Error('Download failed'));

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('isPending state', () => {
    it('should reset isPending to false when isProcessing becomes true', async () => {
      mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result, rerender } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(true);

      mockQueueStoreState.isProcessing = true;

      rerender();

      expect(result.current.isPending).toBe(false);
    });

    it('should reset isPending to false when isComplete becomes true', async () => {
      mockMediaInfoFetcherState.mediaInfo = mockPlaylist;
      mockUseMediaInfoFetcher.mockReturnValue(mockMediaInfoFetcherState);

      const { result, rerender } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(true);

      mockQueueStoreState.isComplete = true;

      rerender();

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('URL clearing', () => {
    it('should call clear when URL is set to empty', () => {
      const { result } = renderHook(() => useDownloadFlow());

      act(() => {
        result.current.setUrl('https://soundcloud.com/artist/track');
      });

      act(() => {
        result.current.setUrl('');
      });

      expect(mockMediaInfoFetcherState.clear).toHaveBeenCalled();
    });
  });
});
