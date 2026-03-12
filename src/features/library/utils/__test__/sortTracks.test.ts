import { describe, it, expect } from 'vitest';
import { sortTracks } from '../sortTracks';
import type { TrackInfo } from '@/bindings';

const makeTracks = (): TrackInfo[] => [
  { id: 1, title: 'Zebra', user: { username: 'Charlie' }, artwork_url: null, duration: 240000, permalink_url: '' },
  { id: 2, title: 'Alpha', user: { username: 'Bob' }, artwork_url: null, duration: 300000, permalink_url: '' },
  { id: 3, title: 'Mango', user: { username: 'Alice' }, artwork_url: null, duration: 180000, permalink_url: '' },
];

describe('sortTracks', () => {
  const tracks = makeTracks();

  it('returns tracks in original order for default mode', () => {
    const result = sortTracks(tracks, 'default');
    expect(result.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('sorts by title ascending', () => {
    const result = sortTracks(tracks, 'title-asc');
    expect(result.map((t) => t.title)).toEqual(['Alpha', 'Mango', 'Zebra']);
  });

  it('sorts by title descending', () => {
    const result = sortTracks(tracks, 'title-desc');
    expect(result.map((t) => t.title)).toEqual(['Zebra', 'Mango', 'Alpha']);
  });

  it('sorts by artist ascending', () => {
    const result = sortTracks(tracks, 'artist-asc');
    expect(result.map((t) => t.user.username)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts by artist descending', () => {
    const result = sortTracks(tracks, 'artist-desc');
    expect(result.map((t) => t.user.username)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('does not mutate the original array', () => {
    const original = [...tracks];
    sortTracks(tracks, 'title-asc');
    expect(tracks.map((t) => t.id)).toEqual(original.map((t) => t.id));
  });

  it('handles empty array', () => {
    expect(sortTracks([], 'title-asc')).toEqual([]);
  });

  it('is case-insensitive for title sort', () => {
    const mixed: TrackInfo[] = [
      { id: 1, title: 'banana', user: { username: 'X' }, artwork_url: null, duration: 100, permalink_url: '' },
      { id: 2, title: 'Apple', user: { username: 'X' }, artwork_url: null, duration: 100, permalink_url: '' },
    ];
    const result = sortTracks(mixed, 'title-asc');
    expect(result.map((t) => t.title)).toEqual(['Apple', 'banana']);
  });
});
