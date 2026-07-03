import type { RemoteTrack } from '@/lib/remote-protocol';
import { mapTrack, type TrackInfoJson } from '@remote/lib/trackMapping';
import type { LibraryPlaylist } from '../utils/filterPlaylists';

interface LibraryPlaylistJson {
  id: number;
  title: string;
  username: string;
  user_id: number | null;
  artwork_url: string | null;
  track_count: number;
  duration: number;
  permalink_url: string;
  is_owned: boolean;
  is_public: boolean;
  secret_token: string | null;
}

function mapPlaylist(p: LibraryPlaylistJson): LibraryPlaylist {
  return {
    id: p.id,
    title: p.title,
    username: p.username,
    userId: p.user_id,
    artworkUrl: p.artwork_url,
    trackCount: p.track_count,
    duration: p.duration,
    permalinkUrl: p.permalink_url,
    isOwned: p.is_owned,
    isPublic: p.is_public,
    secretToken: p.secret_token,
  };
}

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
