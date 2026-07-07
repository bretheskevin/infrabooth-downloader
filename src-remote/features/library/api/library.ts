import type { RemoteTrack } from '@/lib/remote-protocol';
import { mapTrack, type TrackInfoJson } from '@remote/lib/trackMapping';
import { mapPlaylist, type LibraryPlaylist, type LibraryPlaylistJson } from '@remote/lib/playlistMapping';

export async function fetchLibrary(host: string, token: string): Promise<LibraryPlaylist[]> {
  const resp = await fetch(`http://${host}/api/library?t=${token}`);
  if (!resp.ok) throw new Error(`Library fetch failed: ${resp.status}`);
  const data = (await resp.json()) as LibraryPlaylistJson[];
  return data.map(mapPlaylist);
}

export async function resolveArtwork(host: string, token: string, playlistId: number, secretToken: string | null): Promise<string | null> {
  const params = new URLSearchParams({ id: String(playlistId), t: token });
  if (secretToken) params.set('secret', secretToken);
  const resp = await fetch(`http://${host}/api/library-artwork?${params}`);
  if (!resp.ok) throw new Error(`Artwork fetch failed: ${resp.status}`);
  return (await resp.json()) as string | null;
}

export async function fetchPlaylistTracks(
  host: string,
  token: string,
  playlistId: number,
  secretToken: string | null,
): Promise<RemoteTrack[]> {
  const params = new URLSearchParams({ id: String(playlistId), t: token });
  if (secretToken) params.set('secret', secretToken);
  const resp = await fetch(`http://${host}/api/playlist-tracks?${params}`);
  if (!resp.ok) throw new Error(`Playlist tracks fetch failed: ${resp.status}`);
  const data = (await resp.json()) as TrackInfoJson[];
  return data.map(mapTrack);
}
