import type { RemoteTrack } from '@/lib/remote-protocol';
import { mapTrack, type TrackInfoJson } from '@remote/lib/trackMapping';

export async function fetchLikedTracks(host: string, token: string): Promise<RemoteTrack[]> {
  const resp = await fetch(`http://${host}/api/liked-tracks?t=${token}`);
  if (!resp.ok) throw new Error(`Liked tracks fetch failed: ${resp.status}`);
  const data = (await resp.json()) as TrackInfoJson[];
  return data.map(mapTrack);
}
