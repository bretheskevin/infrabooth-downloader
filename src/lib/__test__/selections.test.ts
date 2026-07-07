import { describe, it, expect } from 'vitest';
import { filterPersonalMixes, filterCuratedPicks, CURATED_TITLES } from '../selections';

function sel(id: string, title: string) {
  return { id, title };
}

describe('filterPersonalMixes', () => {
  it('returns selections whose title includes "Your Mix"', () => {
    const input = [sel('1', 'Your Mix 1'), sel('2', 'Daily Drops'), sel('3', 'Your Mix 2'), sel('4', 'Weekly Wave')];
    const result = filterPersonalMixes(input);
    expect(result.map((s) => s.title)).toEqual(['Your Mix 1', 'Your Mix 2']);
  });

  it('returns empty array when no matches', () => {
    const input = [sel('1', 'Daily Drops')];
    expect(filterPersonalMixes(input)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterPersonalMixes([])).toEqual([]);
  });
});

describe('filterCuratedPicks', () => {
  it('returns selections matching CURATED_TITLES sorted by title', () => {
    const input = [sel('1', 'Your Mix 1'), sel('2', 'Weekly Wave'), sel('3', 'Daily Drops')];
    const result = filterCuratedPicks(input);
    expect(result.map((s) => s.title)).toEqual(['Daily Drops', 'Weekly Wave']);
  });

  it('returns empty array when no matches', () => {
    const input = [sel('1', 'Your Mix 1')];
    expect(filterCuratedPicks(input)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterCuratedPicks([])).toEqual([]);
  });
});

describe('CURATED_TITLES', () => {
  it('contains the expected titles', () => {
    expect(CURATED_TITLES).toEqual(['Daily Drops', 'Weekly Wave']);
  });
});
