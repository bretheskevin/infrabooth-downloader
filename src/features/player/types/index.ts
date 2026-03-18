export type PlaybackState = 'stopped' | 'loading' | 'playing' | 'paused';

export interface PlaybackItem {
  trackId: number;
  trackUrl: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  durationMs: number;
  waveformUrl: string | null;
}
