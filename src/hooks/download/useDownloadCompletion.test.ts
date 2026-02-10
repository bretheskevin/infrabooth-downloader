import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownloadCompletion } from './useDownloadCompletion';
import { useQueueStore } from '@/stores/queueStore';

describe('useDownloadCompletion', () => {
  beforeEach(() => {
    // Reset the queue store before each test
    act(() => {
      useQueueStore.setState({
        tracks: [],
        currentIndex: 0,
        totalTracks: 0,
        isProcessing: false,
        isComplete: false,
        completedCount: 0,
        failedCount: 0,
        isRateLimited: false,
        rateLimitedAt: null,
      });
    });
  });

  it('should return initial state when queue is empty', () => {
    const { result } = renderHook(() => useDownloadCompletion());

    expect(result.current.isComplete).toBe(false);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasFailures).toBe(false);
    expect(result.current.isFullSuccess).toBe(false);
  });

  it('should return completion state when queue is complete', () => {
    act(() => {
      useQueueStore.setState({
        isComplete: true,
        completedCount: 10,
        failedCount: 0,
        totalTracks: 10,
      });
    });

    const { result } = renderHook(() => useDownloadCompletion());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.completedCount).toBe(10);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.totalCount).toBe(10);
    expect(result.current.hasFailures).toBe(false);
    expect(result.current.isFullSuccess).toBe(true);
  });

  it('should indicate partial success when there are failures', () => {
    act(() => {
      useQueueStore.setState({
        isComplete: true,
        completedCount: 8,
        failedCount: 2,
        totalTracks: 10,
      });
    });

    const { result } = renderHook(() => useDownloadCompletion());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.completedCount).toBe(8);
    expect(result.current.failedCount).toBe(2);
    expect(result.current.totalCount).toBe(10);
    expect(result.current.hasFailures).toBe(true);
    expect(result.current.isFullSuccess).toBe(false);
  });

  it('should provide resetQueue function that clears the queue', () => {
    act(() => {
      useQueueStore.setState({
        isComplete: true,
        completedCount: 10,
        failedCount: 0,
        totalTracks: 10,
        tracks: [
          {
            id: '1',
            title: 'Test',
            artist: 'Test Artist',
            artworkUrl: null,
            status: 'complete',
          },
        ],
      });
    });

    const { result } = renderHook(() => useDownloadCompletion());

    act(() => {
      result.current.resetQueue();
    });

    expect(result.current.isComplete).toBe(false);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
  });

  it('should not be full success when not complete', () => {
    act(() => {
      useQueueStore.setState({
        isComplete: false,
        completedCount: 5,
        failedCount: 0,
        totalTracks: 10,
      });
    });

    const { result } = renderHook(() => useDownloadCompletion());

    expect(result.current.isFullSuccess).toBe(false);
  });
});
