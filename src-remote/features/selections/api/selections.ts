import type { RemoteTrack } from '@/lib/remote-protocol';
import { mapTrack, type TrackInfoJson } from '@remote/lib/trackMapping';

interface SelectionJson {
  id: string;
  title: string;
  shortTitle: string;
  artworkUrl: string | null;
  trackCount: number;
  tracks: TrackInfoJson[];
}

export interface RemoteSelection {
  id: string;
  title: string;
  shortTitle: string;
  artworkUrl: string | null;
  trackCount: number;
  tracks: RemoteTrack[];
}

function mapSelection(s: SelectionJson): RemoteSelection {
  return {
    id: s.id,
    title: s.title,
    shortTitle: s.shortTitle,
    artworkUrl: s.artworkUrl,
    trackCount: s.trackCount,
    tracks: s.tracks.map(mapTrack),
  };
}

export async function fetchSelections(host: string, token: string): Promise<RemoteSelection[]> {
  const resp = await fetch(`http://${host}/api/selections?t=${token}`);
  if (!resp.ok) throw new Error(`Selections fetch failed: ${resp.status}`);
  const data = (await resp.json()) as SelectionJson[];
  return data.map(mapSelection);
}
