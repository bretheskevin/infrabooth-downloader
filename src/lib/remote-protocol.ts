import type { TrackInfo } from '@/bindings';

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

export const VISUALIZER_STYLE_IDS = ['bars', 'mirrored', 'radial', 'wave'] as const;

export type VisualizerStyle = (typeof VISUALIZER_STYLE_IDS)[number];

export interface VisualizerSettings {
  style: VisualizerStyle;
  showTrackInfo: boolean;
  blurredBackground: boolean;
  artworkColor: boolean;
}

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
  style: 'bars',
  showTrackInfo: true,
  blurredBackground: true,
  artworkColor: false,
};

function isVisualizerStyle(value: unknown): value is VisualizerStyle {
  return typeof value === 'string' && (VISUALIZER_STYLE_IDS as readonly string[]).includes(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeVisualizerSettings(value: unknown): VisualizerSettings {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_VISUALIZER_SETTINGS };
  const record = value as Record<string, unknown>;
  return {
    style: isVisualizerStyle(record.style) ? record.style : DEFAULT_VISUALIZER_SETTINGS.style,
    showTrackInfo: readBoolean(record.showTrackInfo, DEFAULT_VISUALIZER_SETTINGS.showTrackInfo),
    blurredBackground: readBoolean(record.blurredBackground, DEFAULT_VISUALIZER_SETTINGS.blurredBackground),
    artworkColor: readBoolean(record.artworkColor, DEFAULT_VISUALIZER_SETTINGS.artworkColor),
  };
}

export type RemoteCommand =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'toggleShuffle' }
  | { type: 'seek'; positionMs: number }
  | { type: 'setVolume'; volume: number }
  | { type: 'skipTo'; index: number }
  | { type: 'removeFromQueue'; index: number }
  | { type: 'reorderQueue'; fromIndex: number; toIndex: number }
  | { type: 'playTracks'; tracks: RemoteTrack[]; startIndex: number }
  | { type: 'queueTrack'; track: RemoteTrack }
  | { type: 'queueTracks'; tracks: RemoteTrack[] }
  | { type: 'downloadTrack'; track: RemoteTrack; outputDir?: string; secretToken?: string | null; downloadUrl?: string | null }
  | { type: 'downloadPlaylist'; title: string; tracks: TrackInfo[]; outputDir?: string }
  | { type: 'setVisualizerSettings'; settings: VisualizerSettings };

export const REMOTE_SPECTRUM_BAND_COUNT = 24;

export type RemoteSocketControl = { type: 'setSpectrum'; enabled: boolean };

export interface RemoteState {
  state: 'stopped' | 'loading' | 'playing' | 'paused';
  currentTrack: RemoteTrack | null;
  positionMs: number;
  durationMs: number;
  volume: number;
  queue: RemoteTrack[];
  cursor: number;
  shuffle: boolean;
  manualQueueCount: number;
  stationQueueCount: number;
  language: string;
  theme: 'light' | 'dark';
  downloadingTrackIds: number[];
  downloadedTrackIds: number[];
  isSignedIn: boolean;
  downloadPath: string;
  downloadQueueBusy: boolean;
  visualizer: VisualizerSettings;
}
