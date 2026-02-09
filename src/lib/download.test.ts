import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadTrack } from './download';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('downloadTrack', () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke start_track_download with correct parameters', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const expectedPath = '/tmp/123456.aac';

    mockInvoke.mockResolvedValue(expectedPath);

    const result = await downloadTrack(trackUrl, trackId);

    expect(mockInvoke).toHaveBeenCalledWith('start_track_download', {
      trackUrl,
      trackId,
    });
    expect(result).toBe(expectedPath);
  });

  it('should propagate errors from the backend', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const error = { code: 'GEO_BLOCKED', message: 'Content is geo-blocked' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadTrack(trackUrl, trackId)).rejects.toEqual(error);
  });

  it('should handle auth required errors', async () => {
    const trackUrl = 'https://soundcloud.com/artist/track';
    const trackId = '123456';
    const error = { code: 'AUTH_REQUIRED', message: 'Authentication required' };

    mockInvoke.mockRejectedValue(error);

    await expect(downloadTrack(trackUrl, trackId)).rejects.toEqual(error);
  });
});
