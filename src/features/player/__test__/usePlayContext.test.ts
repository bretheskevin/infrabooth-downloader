import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { buildPlaybackQueue } from '../utils/buildPlaybackQueue';
import type { TrackInfo } from '@/bindings';

const mockPlay = vi.fn();
const mockSkipTo = vi.fn();
const mockQueue: { trackId: number }[] = [];

vi.mock('../store', () => ({
  usePlayerStore: {
    getState: () => ({
      queue: mockQueue,
      play: mockPlay,
      skipTo: mockSkipTo,
      syncQueue: vi.fn(),
      playShuffled: vi.fn(),
    }),
  },
}));

import { usePlayContext } from '../hooks/usePlayContext';

const mockTracks: TrackInfo[] = [
  {
    id: 1,
    title: 'Track 1',
    user: { id: 0, username: 'Artist', avatar_url: null },
    artwork_url: null,
    duration: 180000,
    permalink_url: 'https://soundcloud.com/artist/track-1',
    waveform_url: null,
    downloadable: false,
    download_url: null,
    secret_token: null,
  },
  {
    id: 2,
    title: 'Track 2',
    user: { id: 0, username: 'Artist', avatar_url: null },
    artwork_url: null,
    duration: 240000,
    permalink_url: 'https://soundcloud.com/artist/track-2',
    waveform_url: null,
    downloadable: false,
    download_url: null,
    secret_token: null,
  },
];

describe('buildPlaybackQueue', () => {
  it('maps TrackInfo[] to PlaybackItem[]', () => {
    const result = buildPlaybackQueue(mockTracks);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      trackId: 1,
      trackUrl: 'https://soundcloud.com/artist/track-1',
      title: 'Track 1',
      artist: 'Artist',
      artistId: 0,
      artworkUrl: null,
      durationMs: 180000,
      waveformUrl: null,
    });
  });
});

describe('usePlayContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue.length = 0;
  });

  it('always rebuilds queue from tracklist even when track already exists in queue', () => {
    mockQueue.push({ trackId: 1 });

    const { result } = renderHook(() => usePlayContext(mockTracks));

    act(() => {
      result.current.playTrack(0);
    });

    expect(mockPlay).toHaveBeenCalledWith(buildPlaybackQueue(mockTracks), 0);
    expect(mockSkipTo).not.toHaveBeenCalled();
  });

  it('calls play with correct queue and index when track is not in queue', () => {
    const { result } = renderHook(() => usePlayContext(mockTracks));

    act(() => {
      result.current.playTrack(1);
    });

    expect(mockPlay).toHaveBeenCalledWith(buildPlaybackQueue(mockTracks), 1);
    expect(mockSkipTo).not.toHaveBeenCalled();
  });
});
