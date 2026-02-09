import type { TrackInfo } from '@/types/playlist';
import type { Track } from '@/types/track';

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
