import type { TrackInfo } from '@/bindings';

export function filterTracks(tracks: TrackInfo[], searchQuery: string): TrackInfo[] {
  const query = searchQuery.trim().toLocaleLowerCase();
  if (!query) return tracks;

  return tracks.filter((t) => {
    const matchesTitle = t.title.toLocaleLowerCase().includes(query);
    const matchesArtist = t.user.username.toLocaleLowerCase().includes(query);
    return matchesTitle || matchesArtist;
  });
}
