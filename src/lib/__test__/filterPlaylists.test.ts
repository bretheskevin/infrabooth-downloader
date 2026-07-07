import { describe, it, expect } from 'vitest';
import { filterPlaylists } from '../filterPlaylists';

interface Playlist {
  title: string;
  username: string;
  owned: boolean;
}

function pl(title: string, username: string, owned: boolean): Playlist {
  return { title, username, owned };
}

const isOwned = (p: Playlist) => p.owned;

const playlists: Playlist[] = [
  pl('Summer Vibes', 'alice', true),
  pl('Deep House', 'bob', false),
  pl('Alice Mix', 'alice', true),
  pl('Chill Beats', 'carol', false),
];

describe('filterPlaylists', () => {
  it('returns all playlists with empty query and "all" filter', () => {
    expect(filterPlaylists(playlists, '', 'all', isOwned)).toHaveLength(4);
  });

  it('trims and ignores whitespace-only queries', () => {
    expect(filterPlaylists(playlists, '   ', 'all', isOwned)).toHaveLength(4);
  });

  it('filters to owned playlists with "mine"', () => {
    const result = filterPlaylists(playlists, '', 'mine', isOwned);
    expect(result.map((p) => p.title)).toEqual(['Summer Vibes', 'Alice Mix']);
  });

  it('filters to non-owned playlists with "liked"', () => {
    const result = filterPlaylists(playlists, '', 'liked', isOwned);
    expect(result.map((p) => p.title)).toEqual(['Deep House', 'Chill Beats']);
  });

  it('matches on title case-insensitively', () => {
    const result = filterPlaylists(playlists, 'DEEP', 'all', isOwned);
    expect(result.map((p) => p.title)).toEqual(['Deep House']);
  });

  it('matches on username case-insensitively', () => {
    const result = filterPlaylists(playlists, 'alice', 'all', isOwned);
    expect(result.map((p) => p.title)).toEqual(['Summer Vibes', 'Alice Mix']);
  });

  it('combines filter and query', () => {
    const result = filterPlaylists(playlists, 'alice', 'mine', isOwned);
    expect(result.map((p) => p.title)).toEqual(['Summer Vibes', 'Alice Mix']);
  });

  it('returns empty when filter and query have no overlap', () => {
    expect(filterPlaylists(playlists, 'deep', 'mine', isOwned)).toEqual([]);
  });

  it('returns empty when query matches nothing', () => {
    expect(filterPlaylists(playlists, 'zzz', 'all', isOwned)).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(filterPlaylists([], 'anything', 'all', isOwned)).toEqual([]);
  });
});
