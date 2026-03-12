import { describe, it, expect } from 'vitest';
import { filterTracks } from '../filterTracks';
import type { TrackInfo } from '@/bindings';

const makeTracks = (): TrackInfo[] => [
  { id: 1, title: 'Acid Rain', user: { username: 'DJ Kandid' }, artwork_url: null, duration: 240000, permalink_url: '' },
  { id: 2, title: 'Tekno Drive', user: { username: 'Anetha' }, artwork_url: null, duration: 300000, permalink_url: '' },
  { id: 3, title: 'Hard Pulse', user: { username: 'SPFDJ' }, artwork_url: null, duration: 180000, permalink_url: '' },
  { id: 4, title: 'Night Acid', user: { username: 'Anetha' }, artwork_url: null, duration: 420000, permalink_url: '' },
];

describe('filterTracks', () => {
  const tracks = makeTracks();

  it('returns all tracks when query is empty', () => {
    expect(filterTracks(tracks, '')).toHaveLength(4);
  });

  it('filters by title (case-insensitive)', () => {
    const result = filterTracks(tracks, 'acid');
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual([1, 4]);
  });

  it('filters by artist (case-insensitive)', () => {
    const result = filterTracks(tracks, 'anetha');
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual([2, 4]);
  });

  it('matches partial substrings', () => {
    const result = filterTracks(tracks, 'pul');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Hard Pulse');
  });

  it('returns empty when nothing matches', () => {
    expect(filterTracks(tracks, 'nonexistent')).toHaveLength(0);
  });

  it('trims whitespace from query', () => {
    const result = filterTracks(tracks, '  acid  ');
    expect(result).toHaveLength(2);
  });

  it('handles empty tracks array', () => {
    expect(filterTracks([], 'acid')).toHaveLength(0);
  });
});
