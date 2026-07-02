import type { RemoteTrack } from '@/lib/remote-protocol';

interface TrackInfoJson {
  id: number;
  title: string;
  user: { id: number; username: string; avatar_url: string | null };
  artwork_url: string | null;
  duration: number;
  permalink_url: string;
  waveform_url: string | null;
  downloadable: boolean;
  download_url: string | null;
}

function mapTrack(info: TrackInfoJson): RemoteTrack {
  return {
    trackId: info.id,
    trackUrl: info.permalink_url,
    title: info.title,
    artist: info.user.username,
    artistId: info.user.id,
    artworkUrl: info.artwork_url,
    durationMs: info.duration,
    waveformUrl: info.waveform_url,
  };
}

export async function searchTracks(host: string, token: string, query: string): Promise<RemoteTrack[]> {
  const resp = await fetch(`http://${host}/api/search?q=${encodeURIComponent(query)}&t=${token}`);
  const data = (await resp.json()) as TrackInfoJson[];
  return data.map(mapTrack);
}
