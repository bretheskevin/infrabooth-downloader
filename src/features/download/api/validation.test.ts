import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUrl } from './validation';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('validateUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call invoke with correct command and url parameter', async () => {
    const mockResult = { valid: true, urlType: 'playlist', error: null };
    vi.mocked(invoke).mockResolvedValueOnce(mockResult);

    const result = await validateUrl('https://soundcloud.com/user/sets/playlist');

    expect(invoke).toHaveBeenCalledWith('validate_soundcloud_url', { url: 'https://soundcloud.com/user/sets/playlist' });
    expect(result).toEqual(mockResult);
  });

  it('should return validation result for valid playlist URL', async () => {
    const mockResult = { valid: true, urlType: 'playlist', error: null };
    vi.mocked(invoke).mockResolvedValueOnce(mockResult);

    const result = await validateUrl('https://soundcloud.com/user/sets/my-playlist');

    expect(result.valid).toBe(true);
    expect(result.urlType).toBe('playlist');
  });

  it('should return validation result for valid track URL', async () => {
    const mockResult = { valid: true, urlType: 'track', error: null };
    vi.mocked(invoke).mockResolvedValueOnce(mockResult);

    const result = await validateUrl('https://soundcloud.com/artist/track-name');

    expect(result.valid).toBe(true);
    expect(result.urlType).toBe('track');
  });

  it('should return error for profile URL', async () => {
    const mockResult = {
      valid: false,
      urlType: null,
      error: {
        code: 'INVALID_URL',
        message: 'This is a profile, not a playlist or track',
        hint: 'Try pasting a playlist or track link',
      },
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockResult);

    const result = await validateUrl('https://soundcloud.com/user');

    expect(result.valid).toBe(false);
    expect(result.error?.message).toContain('profile');
    expect(result.error?.hint).toBeDefined();
  });

  it('should return error for non-SoundCloud URL', async () => {
    const mockResult = {
      valid: false,
      urlType: null,
      error: {
        code: 'INVALID_URL',
        message: 'Not a SoundCloud URL',
        hint: 'Paste a link from soundcloud.com',
      },
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockResult);

    const result = await validateUrl('https://spotify.com/track/123');

    expect(result.valid).toBe(false);
    expect(result.error?.message).toContain('Not a SoundCloud');
  });

  it('should return error for empty input', async () => {
    const mockResult = {
      valid: false,
      urlType: null,
      error: {
        code: 'INVALID_URL',
        message: 'Invalid URL format',
        hint: null,
      },
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockResult);

    const result = await validateUrl('');

    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe('INVALID_URL');
  });
});
