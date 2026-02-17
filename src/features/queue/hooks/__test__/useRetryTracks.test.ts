import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetryTracks } from '../useRetryTracks';
import { useQueueStore } from '@/features/queue/store';
import { startDownloadQueue } from '@/features/queue/api/download';

vi.mock('@/features/queue/store', () => ({
  useQueueStore: vi.fn(),
}));

vi.mock('@/features/queue/api/download', () => ({
  startDownloadQueue: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const createMockState = (overrides = {}) => ({
  isRetrying: false,
  failedCount: 0,
  isProcessing: false,
  outputDir: '/test/downloads',
  prepareRetryFailed: vi.fn(() => []),
  prepareRetrySingle: vi.fn(() => null),
  setRetrying: vi.fn(),
  setInitializing: vi.fn(),
  ...overrides,
});

describe('useRetryTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canRetry', () => {
    it('should return false when no failed tracks', () => {
      const mockState = createMockState({ failedCount: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );

      const { result } = renderHook(() => useRetryTracks());
      expect(result.current.canRetry).toBe(false);
    });

    it('should return false when processing', () => {
      const mockState = createMockState({ failedCount: 2, isProcessing: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );

      const { result } = renderHook(() => useRetryTracks());
      expect(result.current.canRetry).toBe(false);
    });

    it('should return false when already retrying', () => {
      const mockState = createMockState({ failedCount: 2, isRetrying: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );

      const { result } = renderHook(() => useRetryTracks());
      expect(result.current.canRetry).toBe(false);
    });

    it('should return true when has failures and not processing', () => {
      const mockState = createMockState({ failedCount: 2 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );

      const { result } = renderHook(() => useRetryTracks());
      expect(result.current.canRetry).toBe(true);
    });
  });

  describe('retryAllFailed', () => {
    it('should not retry when no failed tracks', async () => {
      const mockState = createMockState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQueueStore as any).getState = vi.fn(() => mockState);

      const { result } = renderHook(() => useRetryTracks());

      await act(async () => {
        await result.current.retryAllFailed();
      });

      expect(startDownloadQueue).not.toHaveBeenCalled();
    });

    it('should call startDownloadQueue with failed tracks', async () => {
      const failedTracks = [
        { id: '1', title: 'Track 1', artist: 'Artist 1', artworkUrl: null, status: 'failed' as const },
        { id: '2', title: 'Track 2', artist: 'Artist 2', artworkUrl: 'http://art.jpg', status: 'failed' as const },
      ];
      const mockState = createMockState({
        failedCount: 2,
        prepareRetryFailed: vi.fn(() => failedTracks),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQueueStore as any).getState = vi.fn(() => mockState);
      vi.mocked(startDownloadQueue).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRetryTracks());

      await act(async () => {
        await result.current.retryAllFailed();
      });

      expect(mockState.setRetrying).toHaveBeenCalledWith(true);
      expect(mockState.setInitializing).toHaveBeenCalledWith(true);
      expect(startDownloadQueue).toHaveBeenCalledWith({
        tracks: [
          {
            trackUrl: 'https://api.soundcloud.com/tracks/1',
            trackId: '1',
            title: 'Track 1',
            artist: 'Artist 1',
            artworkUrl: null,
          },
          {
            trackUrl: 'https://api.soundcloud.com/tracks/2',
            trackId: '2',
            title: 'Track 2',
            artist: 'Artist 2',
            artworkUrl: 'http://art.jpg',
          },
        ],
        albumName: null,
        outputDir: '/test/downloads',
      });
    });

    it('should reset retrying state on error', async () => {
      const failedTracks = [
        { id: '1', title: 'Track 1', artist: 'Artist 1', artworkUrl: null, status: 'failed' as const },
      ];
      const mockState = createMockState({
        failedCount: 1,
        prepareRetryFailed: vi.fn(() => failedTracks),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQueueStore as any).getState = vi.fn(() => mockState);
      vi.mocked(startDownloadQueue).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRetryTracks());

      await act(async () => {
        await result.current.retryAllFailed();
      });

      expect(mockState.setRetrying).toHaveBeenCalledWith(false);
    });
  });

  describe('retrySingleTrack', () => {
    it('should not retry when track not found', async () => {
      const mockState = createMockState({
        prepareRetrySingle: vi.fn(() => null),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQueueStore as any).getState = vi.fn(() => mockState);

      const { result } = renderHook(() => useRetryTracks());

      await act(async () => {
        await result.current.retrySingleTrack('nonexistent');
      });

      expect(startDownloadQueue).not.toHaveBeenCalled();
    });

    it('should call startDownloadQueue with single track', async () => {
      const track = {
        id: '1',
        title: 'Track 1',
        artist: 'Artist 1',
        artworkUrl: null,
        status: 'failed' as const,
      };
      const mockState = createMockState({
        failedCount: 1,
        prepareRetrySingle: vi.fn(() => track),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQueueStore as any).getState = vi.fn(() => mockState);
      vi.mocked(startDownloadQueue).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRetryTracks());

      await act(async () => {
        await result.current.retrySingleTrack('1');
      });

      expect(mockState.setRetrying).toHaveBeenCalledWith(true);
      expect(mockState.setInitializing).toHaveBeenCalledWith(true);
      expect(startDownloadQueue).toHaveBeenCalledWith({
        tracks: [
          {
            trackUrl: 'https://api.soundcloud.com/tracks/1',
            trackId: '1',
            title: 'Track 1',
            artist: 'Artist 1',
            artworkUrl: null,
          },
        ],
        albumName: null,
        outputDir: '/test/downloads',
      });
    });

    it('should reset retrying state on error', async () => {
      const track = {
        id: '1',
        title: 'Track 1',
        artist: 'Artist 1',
        artworkUrl: null,
        status: 'failed' as const,
      };
      const mockState = createMockState({
        failedCount: 1,
        prepareRetrySingle: vi.fn(() => track),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useQueueStore).mockImplementation((selector: any) =>
        typeof selector === 'function' ? selector(mockState) : mockState
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQueueStore as any).getState = vi.fn(() => mockState);
      vi.mocked(startDownloadQueue).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRetryTracks());

      await act(async () => {
        await result.current.retrySingleTrack('1');
      });

      expect(mockState.setRetrying).toHaveBeenCalledWith(false);
    });
  });
});
