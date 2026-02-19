import { describe, it, expect } from 'vitest';
import {
  trackInfoToQueueTrack,
  playlistTracksToQueueTracks,
  queueTrackToDownloadRequest,
} from '../transforms';
import type { TrackInfo } from '@/features/url-input';
import type { Track } from '@/features/queue/types/track';

const mockTrack: TrackInfo = {
  id: 123456,
  title: 'Test Track',
  user: { username: 'TestArtist' },
  artwork_url: 'https://example.com/art.jpg',
  duration: 180000,
};

const mockTrackNoArtwork: TrackInfo = {
  id: 789,
  title: 'No Art Track',
  user: { username: 'Artist2' },
  artwork_url: null,
  duration: 120000,
};

describe('trackInfoToQueueTrack', () => {
  it('should convert TrackInfo to queue Track', () => {
    const result = trackInfoToQueueTrack(mockTrack);

    expect(result).toEqual({
      id: '123456',
      title: 'Test Track',
      artist: 'TestArtist',
      artworkUrl: 'https://example.com/art.jpg',
      status: 'pending',
    });
  });

  it('should convert numeric id to string', () => {
    const result = trackInfoToQueueTrack(mockTrack);
    expect(typeof result.id).toBe('string');
    expect(result.id).toBe('123456');
  });

  it('should map user.username to artist', () => {
    const result = trackInfoToQueueTrack(mockTrack);
    expect(result.artist).toBe('TestArtist');
  });

  it('should handle null artwork_url', () => {
    const result = trackInfoToQueueTrack(mockTrackNoArtwork);
    expect(result.artworkUrl).toBeNull();
  });

  it('should always set status to pending', () => {
    const result = trackInfoToQueueTrack(mockTrack);
    expect(result.status).toBe('pending');
  });
});

describe('playlistTracksToQueueTracks', () => {
  it('should convert array of TrackInfo to array of queue Tracks', () => {
    const tracks = [mockTrack, mockTrackNoArtwork];
    const result = playlistTracksToQueueTracks(tracks);

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('123456');
    expect(result[1]!.id).toBe('789');
  });

  it('should return empty array for empty input', () => {
    const result = playlistTracksToQueueTracks([]);
    expect(result).toEqual([]);
  });

  it('should preserve order of tracks', () => {
    const tracks = [mockTrackNoArtwork, mockTrack];
    const result = playlistTracksToQueueTracks(tracks);

    expect(result[0]!.id).toBe('789');
    expect(result[1]!.id).toBe('123456');
  });
});

describe('queueTrackToDownloadRequest', () => {
  const mockQueueTrack: Track = {
    id: '123456',
    title: 'Test Track',
    artist: 'TestArtist',
    artworkUrl: 'https://example.com/art.jpg',
    status: 'pending',
  };

  const mockQueueTrackNoArtwork: Track = {
    id: '789',
    title: 'No Art Track',
    artist: 'Artist2',
    artworkUrl: null,
    status: 'pending',
  };

  it('should convert queue Track to QueueItemRequest', () => {
    const result = queueTrackToDownloadRequest(mockQueueTrack);

    expect(result).toEqual({
      trackUrl: 'https://api.soundcloud.com/tracks/123456',
      trackId: '123456',
      title: 'Test Track',
      artist: 'TestArtist',
      artworkUrl: 'https://example.com/art.jpg',
    });
  });

  it('should generate correct SoundCloud API URL', () => {
    const result = queueTrackToDownloadRequest(mockQueueTrack);
    expect(result.trackUrl).toBe('https://api.soundcloud.com/tracks/123456');
  });

  it('should handle null artwork', () => {
    const result = queueTrackToDownloadRequest(mockQueueTrackNoArtwork);
    expect(result.artworkUrl).toBeNull();
  });

  it('should handle null artwork', () => {
    const trackWithNullArt: Track = {
      ...mockQueueTrack,
      artworkUrl: null,
    };
    const result = queueTrackToDownloadRequest(trackWithNullArt);
    expect(result.artworkUrl).toBeNull();
  });
});
