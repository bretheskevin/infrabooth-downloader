import type { TrackInfo, TrackCore } from '@/bindings';
import { buildTrackApiUrl } from '@/lib/soundcloud';

export function toTrackCore(track: TrackInfo): TrackCore {
  return {
    trackUrl: buildTrackApiUrl(track.id),
    trackId: String(track.id),
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url ?? null,
    durationMs: track.duration,
    downloadUrl: track.download_url ?? null,
  };
}
