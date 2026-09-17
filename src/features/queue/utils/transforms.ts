import type { TrackInfo } from '@/features/url-input';
import type { Track } from '@/features/queue/types/track';
import type { TrackCore } from '@/bindings';
import type { DownloadState } from '@/types/download';
import { buildTrackApiUrl } from '@/lib/soundcloud';

export function trackInfoToQueueTrack(track: TrackInfo): Track {
  return {
    id: String(track.id),
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url,
    durationMs: track.duration,
    status: 'pending',
    downloadUrl: track.download_url,
    secretToken: track.secret_token,
  };
}

export function playlistTracksToQueueTracks(tracks: TrackInfo[]): Track[] {
  return tracks.map(trackInfoToQueueTrack);
}

export function queueTrackToDownloadState(track: Track | undefined): DownloadState {
  if (!track) return { status: 'idle' };
  switch (track.status) {
    case 'complete':
    case 'skipped':
      return { status: 'completed' };
    case 'failed':
    case 'rate_limited':
      return { status: 'error', error: track.error?.message ?? 'Unknown error' };
    case 'downloading':
    case 'converting':
      return { status: 'downloading', progress: track.percent ?? 0 };
    default:
      return { status: 'idle' };
  }
}

export function queueTrackToDownloadRequest(track: Track): TrackCore {
  return {
    trackUrl: buildTrackApiUrl(track.id),
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl ?? null,
    durationMs: track.durationMs,
    downloadUrl: track.downloadUrl ?? null,
    secretToken: track.secretToken ?? null,
  };
}
