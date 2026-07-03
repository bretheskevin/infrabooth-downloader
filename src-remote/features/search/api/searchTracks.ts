import type { RemoteTrack } from '@/lib/remote-protocol';
import { mapTrack, type TrackInfoJson } from '@remote/lib/trackMapping';

export async function searchTracks(host: string, token: string, query: string): Promise<RemoteTrack[]> {
  const resp = await fetch(`http://${host}/api/search?q=${encodeURIComponent(query)}&t=${token}`);
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
  const data = (await resp.json()) as TrackInfoJson[];
  return data.map(mapTrack);
}
