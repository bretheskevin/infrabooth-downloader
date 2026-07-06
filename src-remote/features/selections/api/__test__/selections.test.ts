import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchSelections } from '../selections';

describe('fetchSelections', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('maps camelCase Selection JSON with snake_case tracks to RemoteSelection', async () => {
    const json = [
      {
        id: 'soundcloud:selections:abc',
        title: 'Your Mix 1',
        shortTitle: 'Mix 1',
        artworkUrl: 'https://i1.sndcdn.com/artworks-abc-large.jpg',
        trackCount: 2,
        tracks: [
          {
            id: 101,
            title: 'Track A',
            user: { id: 10, username: 'artist1', avatar_url: null },
            artwork_url: 'https://example.com/art1.jpg',
            duration: 200000,
            permalink_url: 'https://soundcloud.com/artist1/track-a',
            waveform_url: null,
            downloadable: false,
            download_url: null,
          },
          {
            id: 102,
            title: 'Track B',
            user: { id: 11, username: 'artist2', avatar_url: null },
            artwork_url: null,
            duration: 180000,
            permalink_url: 'https://soundcloud.com/artist2/track-b',
            waveform_url: 'https://wave.sndcdn.com/b.json',
            downloadable: true,
            download_url: 'https://example.com/dl',
          },
        ],
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => json,
    } as Response);

    const result = await fetchSelections('localhost:3000', 'token123');

    expect(result).toEqual([
      {
        id: 'soundcloud:selections:abc',
        title: 'Your Mix 1',
        shortTitle: 'Mix 1',
        artworkUrl: 'https://i1.sndcdn.com/artworks-abc-large.jpg',
        trackCount: 2,
        tracks: [
          {
            trackId: 101,
            trackUrl: 'https://soundcloud.com/artist1/track-a',
            title: 'Track A',
            artist: 'artist1',
            artistId: 10,
            artworkUrl: 'https://example.com/art1.jpg',
            durationMs: 200000,
            waveformUrl: null,
          },
          {
            trackId: 102,
            trackUrl: 'https://soundcloud.com/artist2/track-b',
            title: 'Track B',
            artist: 'artist2',
            artistId: 11,
            artworkUrl: null,
            durationMs: 180000,
            waveformUrl: 'https://wave.sndcdn.com/b.json',
          },
        ],
      },
    ]);
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);

    await expect(fetchSelections('localhost:3000', 'token123')).rejects.toThrow('Selections fetch failed: 401');
  });

  it('handles selection with null artworkUrl', async () => {
    const json = [
      {
        id: 'sel-1',
        title: 'Daily Drops',
        shortTitle: 'Drops',
        artworkUrl: null,
        trackCount: 0,
        tracks: [],
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => json,
    } as Response);

    const result = await fetchSelections('localhost:3000', 'token123');
    expect(result[0]?.artworkUrl).toBeNull();
    expect(result[0]?.tracks).toEqual([]);
  });
});
