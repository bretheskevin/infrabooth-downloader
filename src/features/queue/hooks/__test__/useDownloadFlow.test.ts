import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownloadFlow } from '../useDownloadFlow';
import type { ValidationResult, PlaylistInfo, TrackInfo } from '@/features/url-input';
import type { Track } from '@/features/queue/types/track';

// Mock the composed hooks
const mockValidationResult = {
  result: null as ValidationResult | null,
  isValidating: false,
};
vi.mock('@/features/url-input', async () => {
  const actual = await vi.importActual('@/features/url-input');
  return {
    ...actual,
    useUrlValidation: vi.fn(() => mockValidationResult),
    useMediaFetch: vi.fn(() => ({
      data: null as PlaylistInfo | TrackInfo | null,
      isLoading: false,
      error: null,
    })),
  };
});

const mockSyncToQueue = vi.fn();
vi.mock('../useSyncToQueue', () => ({
  useSyncToQueue: (media: PlaylistInfo | TrackInfo | null) =>
    mockSyncToQueue(media),
}));

// Mock startDownloadQueue
vi.mock('@/features/queue/api/download', () => ({
  startDownloadQueue: vi.fn(),
}));

// Mock useQueueStore - we use getState().tracks and subscribe to isProcessing
const createMockQueueState = (tracks: Track[] = [], isProcessing = false) => ({
  tracks,
  currentIndex: 0,
  totalTracks: tracks.length,
  isProcessing,
  isInitializing: false,
  isComplete: false,
  isCancelling: false,
  isCancelled: false,
  completedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
  isRateLimited: false,
  rateLimitedAt: null,
  enqueueTracks: vi.fn(),
  updateTrackStatus: vi.fn(),
  setQueueProgress: vi.fn(),
  setQueueComplete: vi.fn(),
  setQueueCancelled: vi.fn(),
  setCancelling: vi.fn(),
  clearQueue: vi.fn(),
  setRateLimited: vi.fn(),
  setInitializing: vi.fn(),
});

const mockQueueStoreState = { isProcessing: false };

vi.mock('@/features/queue/store', () => {
  const mockSelector = vi.fn((selector: (state: { isProcessing: boolean }) => unknown) => {
    return selector(mockQueueStoreState);
  });
  return {
    useQueueStore: Object.assign(mockSelector, {
      getState: vi.fn(() => createMockQueueState()),
    }),
  };
});

import { useUrlValidation, useMediaFetch } from '@/features/url-input';
import { startDownloadQueue } from '@/features/queue/api/download';
import { useQueueStore } from '@/features/queue/store';

const mockUseUrlValidation = vi.mocked(useUrlValidation);
const mockUseMediaFetch = vi.mocked(useMediaFetch);
const mockStartDownloadQueue = vi.mocked(startDownloadQueue);
const mockUseQueueStoreGetState = vi.mocked(useQueueStore.getState);

const mockPlaylist: PlaylistInfo = {
  id: 123,
  title: 'Test Playlist',
  user: { username: 'TestUser' },
  artwork_url: 'https://example.com/art.jpg',
  track_count: 2,
  tracks: [
    {
      id: 1,
      title: 'Track 1',
      user: { username: 'Artist1' },
      artwork_url: null,
      duration: 180000,
    },
  ],
};

const mockTrack: TrackInfo = {
  id: 456,
  title: 'Single Track',
  user: { username: 'Artist2' },
  artwork_url: 'https://example.com/single.jpg',
  duration: 240000,
};

const mockQueueTracksData: Track[] = [
  {
    id: '1',
    title: 'Track 1',
    artist: 'Artist1',
    artworkUrl: 'https://example.com/art1.jpg',
    status: 'pending',
  },
  {
    id: '2',
    title: 'Track 2',
    artist: 'Artist2',
    artworkUrl: null,
    status: 'pending',
  },
];

describe('useDownloadFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueStoreState.isProcessing = false;
    mockUseUrlValidation.mockReturnValue({ result: null, isValidating: false });
    mockUseMediaFetch.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    mockUseQueueStoreGetState.mockReturnValue(createMockQueueState());
    mockStartDownloadQueue.mockResolvedValue(undefined);
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

    expect(mockUseUrlValidation).toHaveBeenCalledWith(
      'https://soundcloud.com/artist/track'
    );
  });

  it('should pass URL and validation to useMediaFetch', () => {
    const validationResult: ValidationResult = { valid: true, urlType: 'track' };
    mockUseUrlValidation.mockReturnValue({
      result: validationResult,
      isValidating: false,
    });

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
    const validationResult: ValidationResult = {
      valid: true,
      urlType: 'playlist',
    };
    mockUseUrlValidation.mockReturnValue({
      result: validationResult,
      isValidating: true,
    });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.validation).toEqual(validationResult);
    expect(result.current.isValidating).toBe(true);
  });

  it('should expose media data from useMediaFetch', () => {
    mockUseMediaFetch.mockReturnValue({
      data: mockPlaylist,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.media).toEqual(mockPlaylist);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should expose loading state from useMediaFetch', () => {
    mockUseMediaFetch.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.isLoading).toBe(true);
  });

  it('should expose error from useMediaFetch', () => {
    const fetchError = { code: 'FETCH_FAILED', message: 'Failed to fetch' };
    mockUseMediaFetch.mockReturnValue({
      data: null,
      isLoading: false,
      error: fetchError,
    });

    const { result } = renderHook(() => useDownloadFlow());

    expect(result.current.error).toEqual(fetchError);
  });

  it('should pass media to useSyncToQueue', () => {
    mockUseMediaFetch.mockReturnValue({
      data: mockPlaylist,
      isLoading: false,
      error: null,
    });

    renderHook(() => useDownloadFlow());

    expect(mockSyncToQueue).toHaveBeenCalledWith(mockPlaylist);
  });

  it('should provide handleDownload function', () => {
    const { result } = renderHook(() => useDownloadFlow());

    expect(typeof result.current.handleDownload).toBe('function');
  });

  describe('handleDownload', () => {
    it('should not call startDownloadQueue when queue is empty', async () => {
      mockUseQueueStoreGetState.mockReturnValue(createMockQueueState());

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockStartDownloadQueue).not.toHaveBeenCalled();
    });

    it('should call startDownloadQueue with tracks from queue', async () => {
      mockUseQueueStoreGetState.mockReturnValue(
        createMockQueueState(mockQueueTracksData)
      );

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockStartDownloadQueue).toHaveBeenCalledWith({
        tracks: [
          {
            trackUrl: 'https://api.soundcloud.com/tracks/1',
            trackId: '1',
            title: 'Track 1',
            artist: 'Artist1',
            artworkUrl: 'https://example.com/art1.jpg',
          },
          {
            trackUrl: 'https://api.soundcloud.com/tracks/2',
            trackId: '2',
            title: 'Track 2',
            artist: 'Artist2',
            artworkUrl: undefined,
          },
        ],
        albumName: undefined,
      });
    });

    it('should include album name when media is a playlist', async () => {
      mockUseMediaFetch.mockReturnValue({
        data: mockPlaylist,
        isLoading: false,
        error: null,
      });
      mockUseQueueStoreGetState.mockReturnValue(
        createMockQueueState(mockQueueTracksData)
      );

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockStartDownloadQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          albumName: 'Test Playlist',
        })
      );
    });

    it('should not include album name when media is a single track', async () => {
      mockUseMediaFetch.mockReturnValue({
        data: mockTrack,
        isLoading: false,
        error: null,
      });
      mockUseQueueStoreGetState.mockReturnValue(
        createMockQueueState(mockQueueTracksData)
      );

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockStartDownloadQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          albumName: undefined,
        })
      );
    });

    it('should convert null artworkUrl to undefined', async () => {
      const tracksWithNullArtwork: Track[] = [
        {
          id: '1',
          title: 'Track 1',
          artist: 'Artist1',
          artworkUrl: null,
          status: 'pending',
        },
      ];
      mockUseQueueStoreGetState.mockReturnValue(
        createMockQueueState(tracksWithNullArtwork)
      );

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(mockStartDownloadQueue).toHaveBeenCalledWith({
        tracks: [
          expect.objectContaining({
            artworkUrl: undefined,
          }),
        ],
        albumName: undefined,
      });
    });

    it('should set isPending to true when download starts', async () => {
      mockUseQueueStoreGetState.mockReturnValue(
        createMockQueueState(mockQueueTracksData)
      );

      const { result } = renderHook(() => useDownloadFlow());

      expect(result.current.isPending).toBe(false);

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(true);
    });

    it('should not set isPending when queue is empty', async () => {
      mockUseQueueStoreGetState.mockReturnValue(createMockQueueState());

      const { result } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('isPending state', () => {
    it('should reset isPending to false when isProcessing becomes true', async () => {
      mockUseQueueStoreGetState.mockReturnValue(
        createMockQueueState(mockQueueTracksData)
      );

      const { result, rerender } = renderHook(() => useDownloadFlow());

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(result.current.isPending).toBe(true);

      mockQueueStoreState.isProcessing = true;

      rerender();

      expect(result.current.isPending).toBe(false);
    });
  });
});
