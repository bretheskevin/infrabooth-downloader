import type { TrackInfo } from '@/features/url-input';
import type { Track } from '@/features/queue/types/track';
import type { QueueItemRequest } from '@/bindings';

/**
 * Convert a single TrackInfo to a queue Track
 */
export function trackInfoToQueueTrack(track: TrackInfo): Track {
  return {
    id: String(track.id),
    title: track.title,
    artist: track.user.username,
    artworkUrl: track.artwork_url,
    status: 'pending',
  };
}

/**
 * Convert playlist tracks to queue tracks
 */
export function playlistTracksToQueueTracks(tracks: TrackInfo[]): Track[] {
  return tracks.map(trackInfoToQueueTrack);
}

/**
 * Convert a queue Track to a download request item
 */
export function queueTrackToDownloadRequest(track: Track): QueueItemRequest {
  return {
    trackUrl: `https://api.soundcloud.com/tracks/${track.id}`,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl ?? null,
  };
}
