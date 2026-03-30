import type { TrackInfo } from '@/bindings';
import type { PlaybackItem } from '../types';

export function buildPlaybackQueue(tracks: TrackInfo[]): PlaybackItem[] {
  return tracks.map((track) => ({
    trackId: track.id,
    trackUrl: track.permalink_url,
    title: track.title,
    artist: track.user.username,
    artistId: track.user.id,
    artworkUrl: track.artwork_url,
    durationMs: track.duration,
    waveformUrl: track.waveform_url,
  }));
}
