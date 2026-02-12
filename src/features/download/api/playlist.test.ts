import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPlaylistInfo } from './playlist';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('fetchPlaylistInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call invoke with correct command and url parameter', async () => {
    const mockPlaylist = {
      id: 123,
      title: 'Test Playlist',
      user: { username: 'testuser' },
      artwork_url: 'https://example.com/art.jpg',
      track_count: 5,
      tracks: [],
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockPlaylist);

    await fetchPlaylistInfo('https://soundcloud.com/user/sets/playlist');

    expect(invoke).toHaveBeenCalledWith('get_playlist_info', {
      url: 'https://soundcloud.com/user/sets/playlist',
    });
  });

  it('should return playlist info with all fields', async () => {
    const mockPlaylist = {
      id: 123,
      title: 'Test Playlist',
      user: { username: 'testuser' },
      artwork_url: 'https://example.com/art.jpg',
      track_count: 2,
      tracks: [
        {
          id: 1,
          title: 'Track 1',
          user: { username: 'artist1' },
          artwork_url: null,
          duration: 180000,
        },
        {
          id: 2,
          title: 'Track 2',
          user: { username: 'artist2' },
          artwork_url: 'https://example.com/track2.jpg',
          duration: 240000,
        },
      ],
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockPlaylist);

    const result = await fetchPlaylistInfo('https://soundcloud.com/user/sets/playlist');

    expect(result.id).toBe(123);
    expect(result.title).toBe('Test Playlist');
    expect(result.user.username).toBe('testuser');
    expect(result.artwork_url).toBe('https://example.com/art.jpg');
    expect(result.track_count).toBe(2);
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0]?.title).toBe('Track 1');
    expect(result.tracks[1]?.title).toBe('Track 2');
  });

  it('should return playlist info with null artwork', async () => {
    const mockPlaylist = {
      id: 456,
      title: 'No Art Playlist',
      user: { username: 'owner' },
      artwork_url: null,
      track_count: 0,
      tracks: [],
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockPlaylist);

    const result = await fetchPlaylistInfo('https://soundcloud.com/user/sets/empty');

    expect(result.artwork_url).toBeNull();
    expect(result.tracks).toHaveLength(0);
  });

  it('should propagate errors from invoke', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('Private content requires sign-in'));

    await expect(fetchPlaylistInfo('https://soundcloud.com/user/sets/playlist')).rejects.toThrow(
      'Private content requires sign-in'
    );
  });

  it('should propagate network errors', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchPlaylistInfo('https://soundcloud.com/user/sets/playlist')).rejects.toThrow(
      'Network error'
    );
  });
});
