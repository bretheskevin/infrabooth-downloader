import type { Track, TrackStatus } from '@/features/queue/types/track';
import type { FailedTrack } from '@/features/queue/types/download';
import type { ErrorCode } from '@/features/queue/types/errors';
import type { TrackInfo } from '@/bindings';

export function createMockTrackInfo(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    id: 1,
    title: 'Track',
    user: { id: 1, username: 'artist', avatar_url: null },
    artwork_url: null,
    duration: 180000,
    permalink_url: 'https://soundcloud.com/artist/track',
    waveform_url: null,
    downloadable: false,
    download_url: null,
    secret_token: null,
    preview_only: false,
    ...overrides,
  };
}

export function createMockTrack(overrides: Partial<Track> & { id: string; status: TrackStatus }): Track {
  return {
    title: `Track ${overrides.id}`,
    artist: `Artist ${overrides.id}`,
    artworkUrl: null,
    durationMs: 180000,
    ...overrides,
  };
}

export function createMockTracks(count: number, status: TrackStatus = 'pending'): Track[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTrack({
      id: `track-${i + 1}`,
      title: `Track ${i + 1}`,
      artist: `Artist ${i + 1}`,
      status,
    }),
  );
}

export function createMockTracksWithStatuses(statuses: TrackStatus[]): Track[] {
  return statuses.map((status, i) =>
    createMockTrack({
      id: `track-${i + 1}`,
      title: `Track ${i + 1}`,
      artist: `Artist ${i + 1}`,
      status,
    }),
  );
}

export function createMockFailedTrack(overrides: {
  id: string;
  title?: string;
  artist?: string;
  errorCode: ErrorCode;
  errorMessage: string;
}): FailedTrack {
  return {
    id: overrides.id,
    title: overrides.title ?? `Track ${overrides.id}`,
    artist: overrides.artist ?? `Artist ${overrides.id}`,
    error: { code: overrides.errorCode, message: overrides.errorMessage },
  };
}
