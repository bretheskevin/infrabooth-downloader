import { describe, it, expect } from 'vitest';
import { filterPlaylists } from '@remote/features/library/utils/filterPlaylists';
import type { LibraryPlaylist } from '@remote/features/library/utils/filterPlaylists';

const makePlaylists = (): LibraryPlaylist[] => [
  {
    id: 1,
    title: 'Acidcore Mix',
    username: 'DJ Acid',
    userId: 11,
    artworkUrl: null,
    trackCount: 20,
    duration: 7200000,
    permalinkUrl: 'https://soundcloud.com/dj-acid/sets/acidcore',
    isOwned: true,
    isPublic: true,
    secretToken: null,
  },
  {
    id: 2,
    title: 'Chill Vibes',
    username: 'ChillGuy',
    userId: 22,
    artworkUrl: null,
    trackCount: 15,
    duration: 3600000,
    permalinkUrl: 'https://soundcloud.com/chillguy/sets/vibes',
    isOwned: false,
    isPublic: true,
    secretToken: null,
  },
  {
    id: 3,
    title: 'Techno Bangers',
    username: 'TechnoKing',
    userId: 33,
    artworkUrl: null,
    trackCount: 30,
    duration: 5400000,
    permalinkUrl: 'https://soundcloud.com/technoking/sets/bangers',
    isOwned: true,
    isPublic: false,
    secretToken: null,
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
    expect(result.every((p) => p.isOwned)).toBe(true);
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

  it('returns empty when chip filter and search have no overlap', () => {
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
