import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDownloadProgress } from './useDownloadProgress';
import { useQueueStore } from '@/stores/queueStore';

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

import { listen } from '@tauri-apps/api/event';

describe('useDownloadProgress', () => {
  const mockListen = vi.mocked(listen);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventHandlers: Record<string, ((event: any) => void)[]>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};

    // Reset store state
    useQueueStore.setState({
      tracks: [
        {
          id: 'track-1',
          title: 'Track 1',
          artist: 'Artist',
          artworkUrl: null,
          status: 'pending',
        },
        {
          id: 'track-2',
          title: 'Track 2',
          artist: 'Artist',
          artworkUrl: null,
          status: 'pending',
        },
      ],
      currentIndex: 0,
      totalTracks: 2,
      isProcessing: false,
      isComplete: false,
      completedCount: 0,
      failedCount: 0,
      isRateLimited: false,
      rateLimitedAt: null,
    });

    // Capture event handlers when listen is called
    mockListen.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eventName: string, handler: any) => {
        if (!eventHandlers[eventName]) {
          eventHandlers[eventName] = [];
        }
        eventHandlers[eventName].push(handler);
        return Promise.resolve(() => {});
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to download-progress events', () => {
    renderHook(() => useDownloadProgress());

    expect(mockListen).toHaveBeenCalledWith(
      'download-progress',
      expect.any(Function)
    );
  });

  it('should subscribe to queue-progress events', () => {
    renderHook(() => useDownloadProgress());

    expect(mockListen).toHaveBeenCalledWith(
      'queue-progress',
      expect.any(Function)
    );
  });

  it('should subscribe to queue-complete events', () => {
    renderHook(() => useDownloadProgress());

    expect(mockListen).toHaveBeenCalledWith(
      'queue-complete',
      expect.any(Function)
    );
  });

  it('should update track status on download-progress event', () => {
    renderHook(() => useDownloadProgress());

    // Simulate receiving a download-progress event
    const handler = eventHandlers['download-progress']?.[0];
    expect(handler).toBeDefined();

    handler!({
      payload: {
        trackId: 'track-1',
        status: 'downloading',
      },
    });

    const { tracks } = useQueueStore.getState();
    expect(tracks[0]?.status).toBe('downloading');
  });

  it('should update track status with error on failed event', () => {
    renderHook(() => useDownloadProgress());

    const handler = eventHandlers['download-progress']?.[0];
    expect(handler).toBeDefined();

    handler!({
      payload: {
        trackId: 'track-1',
        status: 'failed',
        error: {
          code: 'DOWNLOAD_FAILED' as const,
          message: 'Network error',
        },
      },
    });

    const { tracks } = useQueueStore.getState();
    expect(tracks[0]?.status).toBe('failed');
    expect(tracks[0]?.error).toEqual({
      code: 'DOWNLOAD_FAILED',
      message: 'Network error',
    });
  });

  it('should update queue progress on queue-progress event', () => {
    renderHook(() => useDownloadProgress());

    const handler = eventHandlers['queue-progress']?.[0];
    expect(handler).toBeDefined();

    handler!({
      payload: {
        current: 5,
        total: 10,
        trackId: 'track-5',
      },
    });

    const { currentIndex, totalTracks, isProcessing } =
      useQueueStore.getState();
    expect(currentIndex).toBe(5);
    expect(totalTracks).toBe(10);
    expect(isProcessing).toBe(true);
  });

  it('should set queue complete on queue-complete event', () => {
    useQueueStore.setState({ isProcessing: true });

    renderHook(() => useDownloadProgress());

    const handler = eventHandlers['queue-complete']?.[0];
    expect(handler).toBeDefined();

    handler!({
      payload: {
        completed: 8,
        failed: 2,
        total: 10,
        failedTracks: [
          ['track-3', 'Error message'],
          ['track-7', 'Another error'],
        ],
      },
    });

    const { isProcessing, isComplete, completedCount, failedCount } =
      useQueueStore.getState();
    expect(isProcessing).toBe(false);
    expect(isComplete).toBe(true);
    expect(completedCount).toBe(8);
    expect(failedCount).toBe(2);
  });

  it('should clean up listeners on unmount', () => {
    const mockUnlisten = vi.fn();
    mockListen.mockImplementation(() => Promise.resolve(mockUnlisten));

    const { unmount } = renderHook(() => useDownloadProgress());
    unmount();

    // Wait for promises to resolve
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockUnlisten).toHaveBeenCalledTimes(3);
        resolve();
      }, 0);
    });
  });

  describe('rate limit handling', () => {
    it('should set rate limited state when status is rate_limited', () => {
      renderHook(() => useDownloadProgress());

      const handler = eventHandlers['download-progress']?.[0];
      expect(handler).toBeDefined();

      handler!({
        payload: {
          trackId: 'track-1',
          status: 'rate_limited',
        },
      });

      const { isRateLimited } = useQueueStore.getState();
      expect(isRateLimited).toBe(true);
    });

    it('should set rateLimitedAt timestamp when rate limited', () => {
      const beforeTime = Date.now();
      renderHook(() => useDownloadProgress());

      const handler = eventHandlers['download-progress']?.[0];
      expect(handler).toBeDefined();

      handler!({
        payload: {
          trackId: 'track-1',
          status: 'rate_limited',
        },
      });
      const afterTime = Date.now();

      const { rateLimitedAt } = useQueueStore.getState();
      expect(rateLimitedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(rateLimitedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should clear rate limited state when downloading resumes', () => {
      useQueueStore.setState({ isRateLimited: true, rateLimitedAt: Date.now() });
      renderHook(() => useDownloadProgress());

      const handler = eventHandlers['download-progress']?.[0];
      expect(handler).toBeDefined();

      handler!({
        payload: {
          trackId: 'track-1',
          status: 'downloading',
        },
      });

      const { isRateLimited, rateLimitedAt } = useQueueStore.getState();
      expect(isRateLimited).toBe(false);
      expect(rateLimitedAt).toBeNull();
    });

    it('should clear rate limited state when converting starts', () => {
      useQueueStore.setState({ isRateLimited: true, rateLimitedAt: Date.now() });
      renderHook(() => useDownloadProgress());

      const handler = eventHandlers['download-progress']?.[0];
      expect(handler).toBeDefined();

      handler!({
        payload: {
          trackId: 'track-1',
          status: 'converting',
        },
      });

      const { isRateLimited } = useQueueStore.getState();
      expect(isRateLimited).toBe(false);
    });

    it('should set rate limited state when error code is RATE_LIMITED', () => {
      renderHook(() => useDownloadProgress());

      const handler = eventHandlers['download-progress']?.[0];
      expect(handler).toBeDefined();

      handler!({
        payload: {
          trackId: 'track-1',
          status: 'failed',
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
          },
        },
      });

      const { isRateLimited } = useQueueStore.getState();
      expect(isRateLimited).toBe(true);
    });
  });
});
