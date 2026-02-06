import { describe, it, expect, beforeEach } from 'vitest';
import { useQueueStore } from './queueStore';
import type { Track } from '@/types/track';

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
  });

  describe('setTracks', () => {
    it('should set tracks array', () => {
      const { setTracks } = useQueueStore.getState();
      setTracks(mockTracks);

      const { tracks } = useQueueStore.getState();
      expect(tracks).toEqual(mockTracks);
    });

    it('should replace existing tracks', () => {
      const { setTracks } = useQueueStore.getState();
      const firstTrack = mockTracks[0];
      expect(firstTrack).toBeDefined();
      setTracks(mockTracks);
      setTracks([firstTrack!]);

      const { tracks } = useQueueStore.getState();
      expect(tracks).toHaveLength(1);
      expect(tracks[0]?.id).toBe('track-1');
    });
  });

  describe('updateTrackStatus', () => {
    it('should update status of specific track', () => {
      const { setTracks, updateTrackStatus } = useQueueStore.getState();
      setTracks(mockTracks);
      updateTrackStatus('track-1', 'downloading');

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('downloading');
      expect(tracks[1]?.status).toBe('pending');
    });

    it('should update status to complete', () => {
      const { setTracks, updateTrackStatus } = useQueueStore.getState();
      setTracks(mockTracks);
      updateTrackStatus('track-1', 'complete');

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('complete');
    });

    it('should set error when status is failed', () => {
      const { setTracks, updateTrackStatus } = useQueueStore.getState();
      setTracks(mockTracks);
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
      const { setTracks, updateTrackStatus } = useQueueStore.getState();
      setTracks(mockTracks);
      updateTrackStatus('nonexistent', 'downloading');

      const { tracks } = useQueueStore.getState();
      expect(tracks[0]?.status).toBe('pending');
      expect(tracks[1]?.status).toBe('pending');
    });
  });

  describe('clearQueue', () => {
    it('should clear all tracks', () => {
      const { setTracks, clearQueue } = useQueueStore.getState();
      setTracks(mockTracks);
      clearQueue();

      const { tracks } = useQueueStore.getState();
      expect(tracks).toEqual([]);
    });

    it('should reset currentIndex to 0', () => {
      const { setTracks, clearQueue } = useQueueStore.getState();
      setTracks(mockTracks);
      useQueueStore.setState({ currentIndex: 5 });
      clearQueue();

      const { currentIndex } = useQueueStore.getState();
      expect(currentIndex).toBe(0);
    });
  });
});
