import { mapPlaylist, type LibraryPlaylist, type LibraryPlaylistJson } from '@remote/lib/playlistMapping';

export async function searchPlaylists(host: string, token: string, query: string): Promise<LibraryPlaylist[]> {
  const resp = await fetch(`http://${host}/api/search-playlists?q=${encodeURIComponent(query)}&t=${token}`);
  if (!resp.ok) throw new Error(`Playlist search failed: ${resp.status}`);
  const data = (await resp.json()) as LibraryPlaylistJson[];
  return data.map(mapPlaylist);
}
