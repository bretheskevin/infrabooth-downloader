import { describe, it, expect } from 'vitest';
import { filterPlaylists } from '../filterPlaylists';
import type { LibraryPlaylist } from '@/bindings';

const makePlaylists = (): LibraryPlaylist[] => [
  {
    id: 1, title: 'Acidcore Mix', username: 'DJ Acid', artwork_url: null,
    track_count: 20, duration: 7200000,
    permalink_url: 'https://soundcloud.com/dj-acid/sets/acidcore',
    is_owned: true, is_public: true, secret_token: null,
  },
  {
    id: 2, title: 'Chill Vibes', username: 'ChillGuy', artwork_url: null,
    track_count: 15, duration: 3600000,
    permalink_url: 'https://soundcloud.com/chillguy/sets/vibes',
    is_owned: false, is_public: true, secret_token: null,
  },
  {
    id: 3, title: 'Techno Bangers', username: 'TechnoKing', artwork_url: null,
    track_count: 30, duration: 5400000,
    permalink_url: 'https://soundcloud.com/technoking/sets/bangers',
    is_owned: true, is_public: false, secret_token: null,
  },
];

describe('filterPlaylists', () => {
  const playlists = makePlaylists();

  it('returns all playlists when filter is "all" and no search', () => {
    expect(filterPlaylists(playlists, '', 'all')).toHaveLength(3);
  });

  it('returns only owned playlists when filter is "mine"', () => {
    const result = filterPlaylists(playlists, '', 'mine');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.is_owned)).toBe(true);
  });

  it('returns only liked playlists when filter is "liked"', () => {
    const result = filterPlaylists(playlists, '', 'liked');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Chill Vibes');
  });

  it('searches by title (case-insensitive)', () => {
    const result = filterPlaylists(playlists, 'acid', 'all');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Acidcore Mix');
  });

  it('searches by username (case-insensitive)', () => {
    const result = filterPlaylists(playlists, 'technoking', 'all');
    expect(result).toHaveLength(1);
    expect(result[0]?.username).toBe('TechnoKing');
  });

  it('combines chip filter with search', () => {
    const result = filterPlaylists(playlists, 'acid', 'mine');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Acidcore Mix');
  });

  it('returns empty when search matches nothing', () => {
    expect(filterPlaylists(playlists, 'nonexistent', 'all')).toHaveLength(0);
  });

  it('returns empty when chip filter + search has no overlap', () => {
    expect(filterPlaylists(playlists, 'acid', 'liked')).toHaveLength(0);
  });

  it('handles empty playlist array', () => {
    expect(filterPlaylists([], 'anything', 'all')).toHaveLength(0);
  });

  it('trims whitespace from search query', () => {
    const result = filterPlaylists(playlists, '  acid  ', 'all');
    expect(result).toHaveLength(1);
  });
});
