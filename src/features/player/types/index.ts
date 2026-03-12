import type {
  PlaybackState,
  PlaybackItem as BindingsPlaybackItem,
} from '@/bindings';

export type { PlaybackState };

export interface PlaybackItem {
  trackId: number;
  trackUrl: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  durationMs: number;
}

export function toBindingsItem(item: PlaybackItem): BindingsPlaybackItem {
  return {
    track_id: item.trackId,
    track_url: item.trackUrl,
    title: item.title,
    artist: item.artist,
    artwork_url: item.artworkUrl,
    duration_ms: item.durationMs,
  };
}

export function fromBindingsItem(item: BindingsPlaybackItem): PlaybackItem {
  return {
    trackId: item.track_id,
    trackUrl: item.track_url,
    title: item.title,
    artist: item.artist,
    artworkUrl: item.artwork_url,
    durationMs: item.duration_ms,
  };
}

// Event payloads from Rust backend
export interface PlaybackStateChangedEvent {
  state: PlaybackState;
  track_id: number | null;
}

export interface PlayerProgressEvent {
  position_ms: number;
  duration_ms: number;
}

export interface PlayerTrackChangedEvent {
  track_id: number;
  cursor: number;
  queue_length: number;
}

export interface PlayerQueueUpdatedEvent {
  action: 'reorder' | 'remove';
  cursor: number;
  queue_length: number;
}

export interface PlayerErrorEvent {
  track_id: number | null;
  message: string;
}
