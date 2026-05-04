import { describe, it, expect } from 'vitest';
import { buildPlaybackQueue } from '../utils/buildPlaybackQueue';
import type { TrackInfo } from '@/bindings';

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
