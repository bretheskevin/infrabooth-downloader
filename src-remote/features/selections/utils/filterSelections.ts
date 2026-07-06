import type { RemoteSelection } from '../api/selections';

export const CURATED_TITLES = ['Daily Drops', 'Weekly Wave'] as const;

export function filterPersonalMixes(selections: RemoteSelection[]): RemoteSelection[] {
  return selections.filter((s) => s.title.includes('Your Mix'));
}

export function filterCuratedPicks(selections: RemoteSelection[]): RemoteSelection[] {
  return selections.filter((s) => (CURATED_TITLES as readonly string[]).includes(s.title)).sort((a, b) => a.title.localeCompare(b.title));
}
