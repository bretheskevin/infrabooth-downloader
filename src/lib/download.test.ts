import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAndConvertTrack } from './download';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('downloadAndConvertTrack', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke download_track_full with correct parameters', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Artist - Track Name';
    const expectedPath = '/Users/test/Downloads/Artist - Track Name.mp3';

    mockInvoke.mockResolvedValue(expectedPath);

    const result = await downloadAndConvertTrack(trackUrl, trackId, filename);

    expect(mockInvoke).toHaveBeenCalledWith('download_track_full', {
      trackUrl,
      trackId,
      filename,
      outputDir: undefined,
    });
    expect(result).toBe(expectedPath);
  });

  it('should pass optional outputDir parameter', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Artist - Track Name';
    const outputDir = '/custom/path';
    const expectedPath = '/custom/path/Artist - Track Name.mp3';

    mockInvoke.mockResolvedValue(expectedPath);

    const result = await downloadAndConvertTrack(trackUrl, trackId, filename, outputDir);

    expect(mockInvoke).toHaveBeenCalledWith('download_track_full', {
      trackUrl,
      trackId,
      filename,
      outputDir,
    });
    expect(result).toBe(expectedPath);
  });

  it('should propagate download errors from the backend', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Artist - Track Name';
    const error = { code: 'DOWNLOAD_FAILED', message: 'Download failed' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadAndConvertTrack(trackUrl, trackId, filename)).rejects.toEqual(error);
  });

  it('should handle geo-blocked errors', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Artist - Track Name';
    const error = { code: 'GEO_BLOCKED', message: 'Content is geo-blocked' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadAndConvertTrack(trackUrl, trackId, filename)).rejects.toEqual(error);
  });

  it('should handle rate limited errors', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const filename = 'Artist - Track Name';
    const error = { code: 'RATE_LIMITED', message: 'Rate limited' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadAndConvertTrack(trackUrl, trackId, filename)).rejects.toEqual(error);
  });
});
