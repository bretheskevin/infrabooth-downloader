import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSyncToQueue } from './useSyncToQueue';
import type { PlaylistInfo, TrackInfo } from '@/types/playlist';

// Mock queueStore
const mockEnqueueTracks = vi.fn();
vi.mock('@/stores/queueStore', () => ({
  useQueueStore: (selector: (state: { enqueueTracks: typeof mockEnqueueTracks }) => unknown) =>
    selector({ enqueueTracks: mockEnqueueTracks }),
}));

const mockPlaylist: PlaylistInfo = {
  id: 123,
  title: 'Test Playlist',
  user: { username: 'TestUser' },
  artwork_url: 'https://example.com/art.jpg',
  track_count: 2,
  tracks: [
    { id: 1, title: 'Track 1', user: { username: 'Artist1' }, artwork_url: null, duration: 180000 },
    { id: 2, title: 'Track 2', user: { username: 'Artist2' }, artwork_url: 'https://example.com/art2.jpg', duration: 240000 },
  ],
};

const mockTrack: TrackInfo = {
  id: 456,
  title: 'Test Track',
  user: { username: 'TestArtist' },
  artwork_url: 'https://example.com/track-art.jpg',
  duration: 185000,
};

describe('useSyncToQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not call enqueueTracks when media is null', () => {
    renderHook(() => useSyncToQueue(null));

    expect(mockEnqueueTracks).not.toHaveBeenCalled();
  });

  it('should enqueue playlist tracks when media is a playlist', () => {
    renderHook(() => useSyncToQueue(mockPlaylist));

    expect(mockEnqueueTracks).toHaveBeenCalledTimes(1);
    expect(mockEnqueueTracks).toHaveBeenCalledWith([
      {
        id: '1',
        title: 'Track 1',
        artist: 'Artist1',
        artworkUrl: null,
        status: 'pending',
      },
      {
        id: '2',
        title: 'Track 2',
        artist: 'Artist2',
        artworkUrl: 'https://example.com/art2.jpg',
        status: 'pending',
      },
    ]);
  });

  it('should enqueue single track when media is a track', () => {
    renderHook(() => useSyncToQueue(mockTrack));

    expect(mockEnqueueTracks).toHaveBeenCalledTimes(1);
    expect(mockEnqueueTracks).toHaveBeenCalledWith([
      {
        id: '456',
        title: 'Test Track',
        artist: 'TestArtist',
        artworkUrl: 'https://example.com/track-art.jpg',
        status: 'pending',
      },
    ]);
  });

  it('should re-enqueue when media changes', () => {
    const { rerender } = renderHook(
      ({ media }) => useSyncToQueue(media),
      { initialProps: { media: mockTrack as PlaylistInfo | TrackInfo | null } }
    );

    expect(mockEnqueueTracks).toHaveBeenCalledTimes(1);

    // Change to playlist
    rerender({ media: mockPlaylist });

    expect(mockEnqueueTracks).toHaveBeenCalledTimes(2);
  });

  it('should not re-enqueue when media reference stays the same', () => {
    const { rerender } = renderHook(
      ({ media }) => useSyncToQueue(media),
      { initialProps: { media: mockTrack as PlaylistInfo | TrackInfo | null } }
    );

    expect(mockEnqueueTracks).toHaveBeenCalledTimes(1);

    // Rerender with same media
    rerender({ media: mockTrack });

    // Should not call again since media didn't change
    expect(mockEnqueueTracks).toHaveBeenCalledTimes(1);
  });

  it('should handle transition from track to null', () => {
    const { rerender } = renderHook(
      ({ media }) => useSyncToQueue(media),
      { initialProps: { media: mockTrack as PlaylistInfo | TrackInfo | null } }
    );

    expect(mockEnqueueTracks).toHaveBeenCalledTimes(1);

    rerender({ media: null });

    // Should not call enqueueTracks when media becomes null
    expect(mockEnqueueTracks).toHaveBeenCalledTimes(1);
  });
});
