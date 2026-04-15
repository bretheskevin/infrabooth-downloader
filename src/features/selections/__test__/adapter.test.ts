import { describe, it, expect } from 'vitest';
import { toLibraryPlaylist } from '../utils/adapter';
import type { Selection } from '@/bindings';

function makeSelection(overrides: Partial<Selection> = {}): Selection {
  return {
    id: 'soundcloud:system-playlists:daily-mix:0',
    title: 'Daily Mix 1',
    shortTitle: 'Mix 1',
    artworkUrl: 'https://example.com/art.jpg',
    trackCount: 2,
    tracks: [
      {
        id: 1,
        title: 'Track A',
        duration: 180000,
        artwork_url: 'https://example.com/track1.jpg',
        permalink_url: 'https://soundcloud.com/artist/track-a',
        user: { id: 0, username: 'Artist A', avatar_url: null },
        waveform_url: null,
        downloadable: false,
        download_url: null,
      },
      {
        id: 2,
        title: 'Track B',
        duration: 240000,
        artwork_url: null,
        permalink_url: 'https://soundcloud.com/artist/track-b',
        user: { id: 0, username: 'Artist B', avatar_url: null },
        waveform_url: null,
        downloadable: false,
        download_url: null,
      },
    ] as Selection['tracks'],
    ...overrides,
  };
}

describe('toLibraryPlaylist', () => {
  it('maps selection fields to LibraryPlaylist', () => {
    const selection = makeSelection();
    const result = toLibraryPlaylist(selection);

    expect(result.title).toBe('Daily Mix 1');
    expect(result.username).toBe('SoundCloud');
    expect(result.user_id).toBeNull();
    expect(result.artwork_url).toBe('https://example.com/art.jpg');
    expect(result.track_count).toBe(2);
    expect(result.is_owned).toBe(false);
    expect(result.is_public).toBe(true);
    expect(result.secret_token).toBeNull();
    expect(result.permalink_url).toBe('');
  });

  it('computes total duration from tracks', () => {
    const selection = makeSelection();
    const result = toLibraryPlaylist(selection);

    expect(result.duration).toBe(420000);
  });

  it('produces a negative numeric ID', () => {
    const selection = makeSelection();
    const result = toLibraryPlaylist(selection);

    expect(result.id).toBeLessThan(0);
  });

  it('produces deterministic IDs for the same input', () => {
    const a = toLibraryPlaylist(makeSelection());
    const b = toLibraryPlaylist(makeSelection());

    expect(a.id).toBe(b.id);
  });

  it('produces different IDs for different selections', () => {
    const a = toLibraryPlaylist(makeSelection({ id: 'daily-mix:0' }));
    const b = toLibraryPlaylist(makeSelection({ id: 'daily-mix:1' }));

    expect(a.id).not.toBe(b.id);
  });

  it('handles null artwork', () => {
    const selection = makeSelection({ artworkUrl: null });
    const result = toLibraryPlaylist(selection);

    expect(result.artwork_url).toBeNull();
  });

  it('handles empty tracks array', () => {
    const selection = makeSelection({ tracks: [] as Selection['tracks'], trackCount: 0 });
    const result = toLibraryPlaylist(selection);

    expect(result.duration).toBe(0);
    expect(result.track_count).toBe(0);
  });
});
