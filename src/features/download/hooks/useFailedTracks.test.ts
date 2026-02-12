import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFailedTracks } from './useFailedTracks';
import { useQueueStore } from '@/features/download/store';
import type { Track } from '@/features/download/types/track';

// Mock the queue store
vi.mock('@/features/download/store', () => ({
  useQueueStore: vi.fn(),
}));

const createMockTrack = (
  id: string,
  title: string,
  artist: string,
  status: Track['status'],
  error?: Track['error']
): Track => ({
  id,
  title,
  artist,
  artworkUrl: null,
  status,
  error,
});

describe('useFailedTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no tracks have failed', () => {
    vi.mocked(useQueueStore).mockImplementation((selector) =>
      selector({
        tracks: [
          createMockTrack('1', 'Track 1', 'Artist 1', 'complete'),
          createMockTrack('2', 'Track 2', 'Artist 2', 'downloading'),
        ],
        currentIndex: 0,
        totalTracks: 2,
        isProcessing: true,
        isComplete: false,
        completedCount: 1,
        failedCount: 0,
        isRateLimited: false,
        rateLimitedAt: null,
        isInitializing: false,
        isCancelling: false,
        isCancelled: false,
        cancelledCount: 0,
        enqueueTracks: vi.fn(),
        updateTrackStatus: vi.fn(),
        setQueueProgress: vi.fn(),
        setQueueComplete: vi.fn(),
        setQueueCancelled: vi.fn(),
        setCancelling: vi.fn(),
        clearQueue: vi.fn(),
        setRateLimited: vi.fn(),
        setInitializing: vi.fn(),
      })
    );

    const { result } = renderHook(() => useFailedTracks());
    expect(result.current).toEqual([]);
  });

  it('should return only failed tracks', () => {
    const failedTrack = createMockTrack('2', 'Failed Track', 'Artist B', 'failed', {
      code: 'GEO_BLOCKED',
      message: 'Not available',
    });

    vi.mocked(useQueueStore).mockImplementation((selector) =>
      selector({
        tracks: [
          createMockTrack('1', 'Track 1', 'Artist A', 'complete'),
          failedTrack,
          createMockTrack('3', 'Track 3', 'Artist C', 'downloading'),
        ],
        currentIndex: 0,
        totalTracks: 3,
        isProcessing: true,
        isComplete: false,
        completedCount: 1,
        failedCount: 1,
        isRateLimited: false,
        rateLimitedAt: null,
        isInitializing: false,
        isCancelling: false,
        isCancelled: false,
        cancelledCount: 0,
        enqueueTracks: vi.fn(),
        updateTrackStatus: vi.fn(),
        setQueueProgress: vi.fn(),
        setQueueComplete: vi.fn(),
        setQueueCancelled: vi.fn(),
        setCancelling: vi.fn(),
        clearQueue: vi.fn(),
        setRateLimited: vi.fn(),
        setInitializing: vi.fn(),
      })
    );

    const { result } = renderHook(() => useFailedTracks());
    expect(result.current).toHaveLength(1);

    const track = result.current[0];
    expect(track).toBeDefined();
    expect(track?.id).toBe('2');
    expect(track?.title).toBe('Failed Track');
    expect(track?.artist).toBe('Artist B');
    expect(track?.error.code).toBe('GEO_BLOCKED');
  });

  it('should return multiple failed tracks', () => {
    vi.mocked(useQueueStore).mockImplementation((selector) =>
      selector({
        tracks: [
          createMockTrack('1', 'Track 1', 'Artist A', 'failed', {
            code: 'GEO_BLOCKED',
            message: 'Geo blocked',
          }),
          createMockTrack('2', 'Track 2', 'Artist B', 'complete'),
          createMockTrack('3', 'Track 3', 'Artist C', 'failed', {
            code: 'NETWORK_ERROR',
            message: 'Network error',
          }),
        ],
        currentIndex: 0,
        totalTracks: 3,
        isProcessing: false,
        isComplete: true,
        completedCount: 1,
        failedCount: 2,
        isRateLimited: false,
        rateLimitedAt: null,
        isInitializing: false,
        isCancelling: false,
        isCancelled: false,
        cancelledCount: 0,
        enqueueTracks: vi.fn(),
        updateTrackStatus: vi.fn(),
        setQueueProgress: vi.fn(),
        setQueueComplete: vi.fn(),
        setQueueCancelled: vi.fn(),
        setCancelling: vi.fn(),
        clearQueue: vi.fn(),
        setRateLimited: vi.fn(),
        setInitializing: vi.fn(),
      })
    );

    const { result } = renderHook(() => useFailedTracks());
    expect(result.current).toHaveLength(2);
    expect(result.current[0]?.id).toBe('1');
    expect(result.current[1]?.id).toBe('3');
  });

  it('should return FailedTrack with correct shape', () => {
    vi.mocked(useQueueStore).mockImplementation((selector) =>
      selector({
        tracks: [
          createMockTrack('1', 'My Track', 'My Artist', 'failed', {
            code: 'DOWNLOAD_FAILED',
            message: 'Download failed',
          }),
        ],
        currentIndex: 0,
        totalTracks: 1,
        isProcessing: false,
        isComplete: true,
        completedCount: 0,
        failedCount: 1,
        isRateLimited: false,
        rateLimitedAt: null,
        isInitializing: false,
        isCancelling: false,
        isCancelled: false,
        cancelledCount: 0,
        enqueueTracks: vi.fn(),
        updateTrackStatus: vi.fn(),
        setQueueProgress: vi.fn(),
        setQueueComplete: vi.fn(),
        setQueueCancelled: vi.fn(),
        setCancelling: vi.fn(),
        clearQueue: vi.fn(),
        setRateLimited: vi.fn(),
        setInitializing: vi.fn(),
      })
    );

    const { result } = renderHook(() => useFailedTracks());
    const failedTrack = result.current[0];

    expect(failedTrack).toBeDefined();
    expect(failedTrack).toHaveProperty('id');
    expect(failedTrack).toHaveProperty('title');
    expect(failedTrack).toHaveProperty('artist');
    expect(failedTrack).toHaveProperty('error');
    expect(failedTrack?.error).toHaveProperty('code');
    expect(failedTrack?.error).toHaveProperty('message');
  });
});
