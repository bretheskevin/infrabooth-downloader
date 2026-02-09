import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadTrack, downloadAndConvertTrack, DownloadRequest } from './download';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('downloadTrack', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke download_track_full with request object', async () => {
    const request: DownloadRequest = {
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    };
    const expectedPath = '/Users/test/Downloads/Artist - Track Name.mp3';

    mockInvoke.mockResolvedValue(expectedPath);

    const result = await downloadTrack(request);

    expect(mockInvoke).toHaveBeenCalledWith('download_track_full', { request });
    expect(result).toBe(expectedPath);
  });

  it('should pass all metadata fields', async () => {
    const request: DownloadRequest = {
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
      album: 'Playlist Name',
      trackNumber: 5,
      totalTracks: 10,
      artworkUrl: 'https://example.com/art.jpg',
      outputDir: '/custom/path',
    };
    const expectedPath = '/custom/path/Artist - Track Name.mp3';

    mockInvoke.mockResolvedValue(expectedPath);

    const result = await downloadTrack(request);

    expect(mockInvoke).toHaveBeenCalledWith('download_track_full', { request });
    expect(result).toBe(expectedPath);
  });

  it('should propagate download errors from the backend', async () => {
    const request: DownloadRequest = {
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    };
    const error = { code: 'DOWNLOAD_FAILED', message: 'Download failed' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadTrack(request)).rejects.toEqual(error);
  });

  it('should handle geo-blocked errors', async () => {
    const request: DownloadRequest = {
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    };
    const error = { code: 'GEO_BLOCKED', message: 'Content is geo-blocked' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadTrack(request)).rejects.toEqual(error);
  });

  it('should handle rate limited errors', async () => {
    const request: DownloadRequest = {
      trackUrl: 'https://soundcloud.com/artist/track',
      trackId: '123456',
      title: 'Track Name',
      artist: 'Artist',
    };
    const error = { code: 'RATE_LIMITED', message: 'Rate limited' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadTrack(request)).rejects.toEqual(error);
  });
});

describe('downloadAndConvertTrack (deprecated)', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert legacy parameters to request object', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Artist - Track Name';
    const expectedPath = '/Users/test/Downloads/Artist - Track Name.mp3';

    mockInvoke.mockResolvedValue(expectedPath);

    const result = await downloadAndConvertTrack(trackUrl, trackId, filename);

    expect(mockInvoke).toHaveBeenCalledWith('download_track_full', {
      request: {
        trackUrl,
        trackId,
        title: 'Track Name',
        artist: 'Artist',
        outputDir: undefined,
      },
    });
    expect(result).toBe(expectedPath);
  });

  it('should handle filename without separator', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Just A Title';
    const expectedPath = '/Users/test/Downloads/Just A Title.mp3';

    mockInvoke.mockResolvedValue(expectedPath);

    await downloadAndConvertTrack(trackUrl, trackId, filename);

    expect(mockInvoke).toHaveBeenCalledWith('download_track_full', {
      request: {
        trackUrl,
        trackId,
        title: 'Just A Title',
        artist: 'Just A Title',
        outputDir: undefined,
      },
    });
  });

  it('should pass outputDir to request object', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Artist - Track';
    const outputDir = '/custom/path';
    const expectedPath = '/custom/path/Artist - Track.mp3';

    mockInvoke.mockResolvedValue(expectedPath);

    await downloadAndConvertTrack(trackUrl, trackId, filename, outputDir);

    expect(mockInvoke).toHaveBeenCalledWith('download_track_full', {
      request: {
        trackUrl,
        trackId,
        title: 'Track',
        artist: 'Artist',
        outputDir,
      },
    });
  });
});
