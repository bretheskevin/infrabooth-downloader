export interface RemoteTrack {
  trackId: number;
  trackUrl: string;
  title: string;
  artist: string;
  artistId: number;
  artworkUrl: string | null;
  durationMs: number;
  waveformUrl: string | null;
}

export type RemoteCommand =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'seek'; positionMs: number }
  | { type: 'setVolume'; volume: number }
  | { type: 'skipTo'; index: number }
  | { type: 'removeFromQueue'; index: number }
  | { type: 'reorderQueue'; fromIndex: number; toIndex: number }
  | { type: 'playTrack'; track: RemoteTrack }
  | { type: 'queueTrack'; track: RemoteTrack }
  | { type: 'downloadTrack'; track: RemoteTrack };

export interface RemoteState {
  state: 'stopped' | 'loading' | 'playing' | 'paused';
  currentTrack: RemoteTrack | null;
  positionMs: number;
  durationMs: number;
  volume: number;
  queue: RemoteTrack[];
  cursor: number;
  language: string;
  theme: 'light' | 'dark';
  downloadingTrackIds: number[];
  downloadedTrackIds: number[];
}
