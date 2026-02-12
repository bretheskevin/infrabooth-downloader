import { describe, it, expect, beforeEach } from 'vitest';
import { useQueueStore } from '../store';
import type { Track } from '@/features/download/types/track';
import type { QueueCompleteEvent } from '@/types/events';

describe('queueStore', () => {
  const mockTracks: Track[] = [
    {
      id: 'track-1',
      title: 'Test Track 1',
      artist: 'Artist 1',
      artworkUrl: 'https://example.com/art1.jpg',
      status: 'pending',
    },
    {
      id: 'track-2',
      title: 'Test Track 2',
      artist: 'Artist 2',
      artworkUrl: null,
      status: 'pending',
    },
  ];

  beforeEach(() => {
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

  describe('initial state', () => {
    it('should have empty tracks array', () => {
      const { tracks } = useQueueStore.getState();
      expect(tracks).toEqual([]);
    });

    it('should have currentIndex as 0', () => {
      const { currentIndex } = useQueueStore.getState();
      expect(currentIndex).toBe(0);
    });

    it('should have totalTracks as 0', () => {
      const { totalTracks } = useQueueStore.getState();
      expect(totalTracks).toBe(0);
    });

    it('should have isProcessing as false', () => {
      const { isProcessing } = useQueueStore.getState();
      expect(isProcessing).toBe(false);
    });

    it('should have isComplete as false', () => {
      const { isComplete } = useQueueStore.getState();
      expect(isComplete).toBe(false);
    });

    it('should have completedCount as 0', () => {
      const { completedCount } = useQueueStore.getState();
      expect(completedCount).toBe(0);
    });

    it('should have failedCount as 0', () => {
      const { failedCount } = useQueueStore.getState();
      expect(failedCount).toBe(0);
    });

    it('should have isRateLimited as false', () => {
      const { isRateLimited } = useQueueStore.getState();
      expect(isRateLimited).toBe(false);
    });

    it('should have rateLimitedAt as null', () => {
      const { rateLimitedAt } = useQueueStore.getState();
      expect(rateLimitedAt).toBeNull();
    });
  });

  describe('enqueueTracks', () => {
    it('should set tracks array', () => {
      const { enqueueTracks } = useQueueStore.getState();
      enqueueTracks(mockTracks);

      const { tracks } = useQueueStore.getState();
      expect(tracks).toEqual(mockTracks);
    });

    it('should set totalTracks to tracks length', () => {
      const { enqueueTracks } = useQueueStore.getState();
      enqueueTracks(mockTracks);

      const { totalTracks } = useQueueStore.getState();
      expect(totalTracks).toBe(2);
    });

    it('should reset currentIndex to 0', () => {
      useQueueStore.setState({ currentIndex: 5 });
      const { enqueueTracks } = useQueueStore.getState();
      enqueueTracks(mockTracks);

      const { currentIndex } = useQueueStore.getState();
      expect(currentIndex).toBe(0);
    });

    it('should reset isProcessing to false', () => {
      useQueueStore.setState({ isProcessing: true });
      const { enqueueTracks } = useQueueStore.getState();
      enqueueTracks(mockTracks);

      const { isProcessing } = useQueueStore.getState();
      expect(isProcessing).toBe(false);
    });

    it('should reset isComplete to false', () => {
      useQueueStore.setState({ isComplete: true });
      const { enqueueTracks } = useQueueStore.getState();
      enqueueTracks(mockTracks);

      const { isComplete } = useQueueStore.getState();
      expect(isComplete).toBe(false);
    });

    it('should replace existing tracks', () => {
      const { enqueueTracks } = useQueueStore.getState();
      const firstTrack = mockTracks[0];
      expect(firstTrack).toBeDefined();
      enqueueTracks(mockTracks);
      enqueueTracks([firstTrack!]);

      const { tracks } = useQueueStore.getState();
      expect(tracks).toHaveLength(1);
      expect(tracks[0]?.id).toBe('track-1');
    });
  });

  describe('updateTrackStatus', () => {
    it('should update status of specific track', () => {
      const { enqueueTracks, updateTrackStatus } = useQueueStore.getState();
      enqueueTracks(mockTracks);
      updateTrackStatus('track-1', 'downloading');

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('downloading');
      expect(tracks[1]?.status).toBe('pending');
    });

    it('should update status to complete', () => {
      const { enqueueTracks, updateTrackStatus } = useQueueStore.getState();
      enqueueTracks(mockTracks);
      updateTrackStatus('track-1', 'complete');

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('complete');
    });

    it('should update status to rate_limited', () => {
      const { enqueueTracks, updateTrackStatus } = useQueueStore.getState();
      enqueueTracks(mockTracks);
      updateTrackStatus('track-1', 'rate_limited');

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('rate_limited');
    });

    it('should set error when status is failed', () => {
      const { enqueueTracks, updateTrackStatus } = useQueueStore.getState();
      enqueueTracks(mockTracks);
      updateTrackStatus('track-1', 'failed', {
        code: 'DOWNLOAD_FAILED',
        message: 'Download failed',
      });

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('failed');
      expect(tracks[0]?.error).toEqual({
        code: 'DOWNLOAD_FAILED',
        message: 'Download failed',
      });
    });

    it('should not modify tracks if id not found', () => {
      const { enqueueTracks, updateTrackStatus } = useQueueStore.getState();
      enqueueTracks(mockTracks);
      updateTrackStatus('nonexistent', 'downloading');

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('pending');
      expect(tracks[1]?.status).toBe('pending');
    });
  });

  describe('setQueueProgress', () => {
    it('should update currentIndex and totalTracks', () => {
      const { setQueueProgress } = useQueueStore.getState();
      // Simulate backend sending 1-indexed current (5 of 10)
      setQueueProgress(5, 10);

      const { currentIndex, totalTracks } = useQueueStore.getState();
      // currentIndex should be 0-indexed (4) for array access
      expect(currentIndex).toBe(4);
      expect(totalTracks).toBe(10);
    });

    it('should set isProcessing to true', () => {
      const { setQueueProgress } = useQueueStore.getState();
      setQueueProgress(1, 5);

      const { isProcessing } = useQueueStore.getState();
      expect(isProcessing).toBe(true);
    });
  });

  describe('setQueueComplete', () => {
    it('should update completed and failed counts', () => {
      const result: QueueCompleteEvent = {
        completed: 8,
        failed: 2,
        total: 10,
        failedTracks: [
          ['track-1', 'Error 1'],
          ['track-2', 'Error 2'],
        ],
      };

      const { setQueueComplete } = useQueueStore.getState();
      setQueueComplete(result);

      const { completedCount, failedCount } = useQueueStore.getState();
      expect(completedCount).toBe(8);
      expect(failedCount).toBe(2);
    });

    it('should set isProcessing to false', () => {
      useQueueStore.setState({ isProcessing: true });
      const result: QueueCompleteEvent = {
        completed: 5,
        failed: 0,
        total: 5,
        failedTracks: [],
      };

      const { setQueueComplete } = useQueueStore.getState();
      setQueueComplete(result);

      const { isProcessing } = useQueueStore.getState();
      expect(isProcessing).toBe(false);
    });

    it('should set isComplete to true', () => {
      const result: QueueCompleteEvent = {
        completed: 5,
        failed: 0,
        total: 5,
        failedTracks: [],
      };

      const { setQueueComplete } = useQueueStore.getState();
      setQueueComplete(result);

      const { isComplete } = useQueueStore.getState();
      expect(isComplete).toBe(true);
    });
  });

  describe('clearQueue', () => {
    it('should clear all tracks', () => {
      const { enqueueTracks, clearQueue } = useQueueStore.getState();
      enqueueTracks(mockTracks);
      clearQueue();

      const { tracks } = useQueueStore.getState();
      expect(tracks).toEqual([]);
    });

    it('should reset currentIndex to 0', () => {
      const { enqueueTracks, clearQueue } = useQueueStore.getState();
      enqueueTracks(mockTracks);
      useQueueStore.setState({ currentIndex: 5 });
      clearQueue();

      const { currentIndex } = useQueueStore.getState();
      expect(currentIndex).toBe(0);
    });

    it('should reset all progress state', () => {
      useQueueStore.setState({
        totalTracks: 10,
        isProcessing: true,
        isComplete: true,
        completedCount: 8,
        failedCount: 2,
      });

      const { clearQueue } = useQueueStore.getState();
      clearQueue();

      const state = useQueueStore.getState();
      expect(state.totalTracks).toBe(0);
      expect(state.isProcessing).toBe(false);
      expect(state.isComplete).toBe(false);
      expect(state.completedCount).toBe(0);
      expect(state.failedCount).toBe(0);
    });

    it('should reset rate limit state', () => {
      useQueueStore.setState({
        isRateLimited: true,
        rateLimitedAt: Date.now(),
      });

      const { clearQueue } = useQueueStore.getState();
      clearQueue();

      const state = useQueueStore.getState();
      expect(state.isRateLimited).toBe(false);
      expect(state.rateLimitedAt).toBeNull();
    });
  });

  describe('setRateLimited', () => {
    it('should set isRateLimited to true when called with true', () => {
      const { setRateLimited } = useQueueStore.getState();
      setRateLimited(true);

      const { isRateLimited } = useQueueStore.getState();
      expect(isRateLimited).toBe(true);
    });

    it('should set rateLimitedAt timestamp when rate limited', () => {
      const beforeTime = Date.now();
      const { setRateLimited } = useQueueStore.getState();
      setRateLimited(true);
      const afterTime = Date.now();

      const { rateLimitedAt } = useQueueStore.getState();
      expect(rateLimitedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(rateLimitedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should set isRateLimited to false when called with false', () => {
      useQueueStore.setState({ isRateLimited: true, rateLimitedAt: Date.now() });
      const { setRateLimited } = useQueueStore.getState();
      setRateLimited(false);

      const { isRateLimited } = useQueueStore.getState();
      expect(isRateLimited).toBe(false);
    });

    it('should clear rateLimitedAt when rate limit cleared', () => {
      useQueueStore.setState({ isRateLimited: true, rateLimitedAt: Date.now() });
      const { setRateLimited } = useQueueStore.getState();
      setRateLimited(false);

      const { rateLimitedAt } = useQueueStore.getState();
      expect(rateLimitedAt).toBeNull();
    });
  });

  describe('enqueueTracks rate limit reset', () => {
    it('should reset rate limit state when enqueueing new tracks', () => {
      useQueueStore.setState({
        isRateLimited: true,
        rateLimitedAt: Date.now(),
      });

      const { enqueueTracks } = useQueueStore.getState();
      enqueueTracks(mockTracks);

      const state = useQueueStore.getState();
      expect(state.isRateLimited).toBe(false);
      expect(state.rateLimitedAt).toBeNull();
    });
  });

  describe('multiple rate limit occurrences', () => {
    it('should allow rate limit to be set multiple times', () => {
      const { setRateLimited } = useQueueStore.getState();

      // First rate limit
      setRateLimited(true);
      expect(useQueueStore.getState().isRateLimited).toBe(true);
      const firstTimestamp = useQueueStore.getState().rateLimitedAt;

      // Clear rate limit
      setRateLimited(false);
      expect(useQueueStore.getState().isRateLimited).toBe(false);

      // Second rate limit - should work again
      setRateLimited(true);
      expect(useQueueStore.getState().isRateLimited).toBe(true);
      const secondTimestamp = useQueueStore.getState().rateLimitedAt;

      // Timestamps should be different (or at least present)
      expect(secondTimestamp).not.toBeNull();
      expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp!);
    });

    it('should reset timestamp on each new rate limit', () => {
      const { setRateLimited } = useQueueStore.getState();

      setRateLimited(true);
      const firstTimestamp = useQueueStore.getState().rateLimitedAt;

      setRateLimited(false);
      expect(useQueueStore.getState().rateLimitedAt).toBeNull();

      // Small delay to ensure different timestamp
      setRateLimited(true);
      const secondTimestamp = useQueueStore.getState().rateLimitedAt;

      expect(secondTimestamp).not.toBeNull();
      expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp!);
    });
  });
});
