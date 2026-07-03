import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchLibrary, fetchPlaylistTracks, resolveArtwork } from '@remote/features/library/api/library';

describe('fetchLibrary', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('maps snake_case JSON to camelCase LibraryPlaylist', async () => {
    const json = [
      {
        id: 42,
        title: 'My Playlist',
        username: 'soundclouduser',
        user_id: 7,
        artwork_url: 'https://example.com/art.jpg',
        track_count: 12,
        duration: 360000,
        permalink_url: 'https://soundcloud.com/user/playlist',
        is_owned: true,
        is_public: false,
        secret_token: 'abc123',
      },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => json,
    } as Response);

    const result = await fetchLibrary('localhost:3000', 'token123');

    expect(result).toEqual([
      {
        id: 42,
        title: 'My Playlist',
        username: 'soundclouduser',
        userId: 7,
        artworkUrl: 'https://example.com/art.jpg',
        trackCount: 12,
        duration: 360000,
        permalinkUrl: 'https://soundcloud.com/user/playlist',
        isOwned: true,
        isPublic: false,
        secretToken: 'abc123',
      },
    ]);
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchLibrary('localhost:3000', 'token123')).rejects.toThrow('Library fetch failed: 500');
  });
});

describe('resolveArtwork', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns the resolved artwork URL', async () => {
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((url) => {
      capturedUrl = url as string;
      return Promise.resolve({ ok: true, json: async () => 'https://i1.sndcdn.com/artworks-abc-large.jpg' } as Response);
    });

    const result = await resolveArtwork('localhost:3000', 'token123', 42, null);

    expect(result).toBe('https://i1.sndcdn.com/artworks-abc-large.jpg');
    expect(capturedUrl).toContain('/api/library-artwork?id=42');
    expect(capturedUrl).not.toContain('secret=');
  });

  it('includes secret= param when secretToken provided', async () => {
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((url) => {
      capturedUrl = url as string;
      return Promise.resolve({ ok: true, json: async () => null } as Response);
    });

    await resolveArtwork('localhost:3000', 'token123', 42, 'mysecret');

    expect(capturedUrl).toContain('secret=mysecret');
  });

  it('returns null when no artwork is resolvable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    } as Response);

    await expect(resolveArtwork('localhost:3000', 'token123', 42, null)).resolves.toBeNull();
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(resolveArtwork('localhost:3000', 'token123', 42, null)).rejects.toThrow('Artwork fetch failed: 500');
  });
});

describe('fetchPlaylistTracks', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('maps TrackInfoJson to RemoteTrack', async () => {
    const json = [
      {
        id: 99,
        title: 'Cool Track',
        user: { id: 5, username: 'artist', avatar_url: null },
        artwork_url: 'https://example.com/art.jpg',
        duration: 180000,
        permalink_url: 'https://soundcloud.com/artist/cool-track',
        waveform_url: 'https://wave.sndcdn.com/cool.json',
        downloadable: false,
        download_url: null,
      },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => json,
    } as Response);

    const result = await fetchPlaylistTracks('localhost:3000', 'token123', 42, null);

    expect(result).toEqual([
      {
        trackId: 99,
        trackUrl: 'https://soundcloud.com/artist/cool-track',
        title: 'Cool Track',
        artist: 'artist',
        artistId: 5,
        artworkUrl: 'https://example.com/art.jpg',
        durationMs: 180000,
        waveformUrl: 'https://wave.sndcdn.com/cool.json',
      },
    ]);
  });

  it('includes secret= param when secretToken provided', async () => {
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((url) => {
      capturedUrl = url as string;
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    await fetchPlaylistTracks('localhost:3000', 'token123', 42, 'mysecret');

    expect(capturedUrl).toContain('secret=mysecret');
  });

  it('omits secret= param when secretToken is null', async () => {
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((url) => {
      capturedUrl = url as string;
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    await fetchPlaylistTracks('localhost:3000', 'token123', 42, null);

    expect(capturedUrl).not.toContain('secret=');
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    await expect(fetchPlaylistTracks('localhost:3000', 'token123', 42, null)).rejects.toThrow('Playlist tracks fetch failed: 401');
  });
});
