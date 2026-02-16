import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadTrack,
  startDownloadQueue,
  type DownloadRequest,
  type StartQueueRequest,
  type QueueItemRequest,
} from '../download';

// Mock the bindings module
vi.mock('@/bindings', () => ({
  commands: {
    downloadTrackFull: vi.fn(),
    startDownloadQueue: vi.fn(),
    cancelDownloadQueue: vi.fn(),
  },
}));

import { commands } from '@/bindings';

const mockDownloadTrackFull = vi.mocked(commands.downloadTrackFull);
const mockStartDownloadQueue = vi.mocked(commands.startDownloadQueue);

// Helper to create a complete DownloadRequest
const createDownloadRequest = (
  partial: Partial<DownloadRequest> & Pick<DownloadRequest, 'trackUrl' | 'trackId' | 'title' | 'artist'>
): DownloadRequest => ({
  album: null,
  trackNumber: null,
  totalTracks: null,
  artworkUrl: null,
  outputDir: null,
  ...partial,
});

// Helper to create a complete QueueItemRequest
const createQueueItem = (
  partial: Partial<QueueItemRequest> & Pick<QueueItemRequest, 'trackUrl' | 'trackId' | 'title' | 'artist'>
): QueueItemRequest => ({
  artworkUrl: null,
  ...partial,
});

describe('downloadTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke downloadTrackFull with request object', async () => {
    const request = createDownloadRequest({
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    });
    const expectedPath = '/Users/test/Downloads/Artist - Track Name.mp3';

    mockDownloadTrackFull.mockResolvedValue({ status: 'ok', data: expectedPath });

    const result = await downloadTrack(request);

    expect(mockDownloadTrackFull).toHaveBeenCalledWith(request);
    expect(result).toBe(expectedPath);
  });

  it('should pass all metadata fields', async () => {
    const request = createDownloadRequest({
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
      album: 'Playlist Name',
      trackNumber: 5,
      totalTracks: 10,
      artworkUrl: 'https://example.com/art.jpg',
      outputDir: '/custom/path',
    });
    const expectedPath = '/custom/path/Artist - Track Name.mp3';

    mockDownloadTrackFull.mockResolvedValue({ status: 'ok', data: expectedPath });

    const result = await downloadTrack(request);

    expect(mockDownloadTrackFull).toHaveBeenCalledWith(request);
    expect(result).toBe(expectedPath);
  });

  it('should propagate download errors from the backend', async () => {
    const request = createDownloadRequest({
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    });
    const error = { code: 'DOWNLOAD_FAILED', message: 'Download failed' };

    mockDownloadTrackFull.mockResolvedValue({ status: 'error', error });

    await expect(downloadTrack(request)).rejects.toThrow('Download failed');
  });

  it('should handle geo-blocked errors', async () => {
    const request = createDownloadRequest({
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    });
    const error = { code: 'GEO_BLOCKED', message: 'Content is geo-blocked' };

    mockDownloadTrackFull.mockResolvedValue({ status: 'error', error });

    await expect(downloadTrack(request)).rejects.toThrow('Content is geo-blocked');
  });

  it('should handle rate limited errors', async () => {
    const request = createDownloadRequest({
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    });
    const error = { code: 'RATE_LIMITED', message: 'Rate limited' };

    mockDownloadTrackFull.mockResolvedValue({ status: 'error', error });

    await expect(downloadTrack(request)).rejects.toThrow('Rate limited');
  });
});

describe('startDownloadQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke startDownloadQueue with request object', async () => {
    const request: StartQueueRequest = {
      tracks: [
        createQueueItem({
          trackUrl: 'https://soundcloud.com/artist/track1',
          trackId: '1',
          title: 'Track 1',
          artist: 'Artist',
        }),
        createQueueItem({
          trackUrl: 'https://soundcloud.com/artist/track2',
          trackId: '2',
          title: 'Track 2',
          artist: 'Artist',
          artworkUrl: 'https://example.com/art.jpg',
        }),
      ],
      albumName: 'Playlist Name',
      outputDir: null,
    };

    mockStartDownloadQueue.mockResolvedValue({ status: 'ok', data: null });

    await startDownloadQueue(request);

    expect(mockStartDownloadQueue).toHaveBeenCalledWith(request);
  });

  it('should work without album name', async () => {
    const request: StartQueueRequest = {
      tracks: [
        createQueueItem({
          trackUrl: 'https://soundcloud.com/artist/track',
          trackId: '123',
          title: 'Single Track',
          artist: 'Artist',
        }),
      ],
      albumName: null,
      outputDir: null,
    };

    mockStartDownloadQueue.mockResolvedValue({ status: 'ok', data: null });

    await startDownloadQueue(request);

    expect(mockStartDownloadQueue).toHaveBeenCalledWith(request);
  });

  it('should handle empty tracks array', async () => {
    const request: StartQueueRequest = {
      tracks: [],
      albumName: null,
      outputDir: null,
    };

    mockStartDownloadQueue.mockResolvedValue({ status: 'ok', data: null });

    await startDownloadQueue(request);

    expect(mockStartDownloadQueue).toHaveBeenCalledWith(request);
  });

  it('should propagate errors from the backend', async () => {
    const request: StartQueueRequest = {
      tracks: [
        createQueueItem({
          trackUrl: 'https://soundcloud.com/artist/track',
          trackId: '123',
          title: 'Track',
          artist: 'Artist',
        }),
      ],
      albumName: null,
      outputDir: null,
    };
    const errorMessage = 'Failed to start queue';

    mockStartDownloadQueue.mockResolvedValue({ status: 'error', error: errorMessage });

    await expect(startDownloadQueue(request)).rejects.toThrow('Failed to start queue');
  });
});
