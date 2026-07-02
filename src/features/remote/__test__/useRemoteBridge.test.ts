import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RemoteTrack } from '@/lib/remote-protocol';

const {
  mockPause,
  mockResume,
  mockNext,
  mockPrevious,
  mockSeek,
  mockSetVolume,
  mockSkipTo,
  mockPlay,
  mockAddToQueue,
  mockDownloadTrackFull,
} = vi.hoisted(() => ({
  mockPause: vi.fn(),
  mockResume: vi.fn(),
  mockNext: vi.fn().mockResolvedValue(undefined),
  mockPrevious: vi.fn().mockResolvedValue(undefined),
  mockSeek: vi.fn(),
  mockSetVolume: vi.fn(),
  mockSkipTo: vi.fn().mockResolvedValue(undefined),
  mockPlay: vi.fn().mockResolvedValue(undefined),
  mockAddToQueue: vi.fn(),
  mockDownloadTrackFull: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/bindings', () => ({
  commands: {
    downloadTrackFull: mockDownloadTrackFull,
  },
}));

vi.mock('@/features/player/store', () => ({
  usePlayerStore: {
    getState: vi.fn(() => ({
      state: 'paused' as const,
      currentTrack: null,
      positionMs: 1000,
      durationMs: 180000,
      volume: 0.8,
      queue: [],
      cursor: 0,
      pause: mockPause,
      resume: mockResume,
      next: mockNext,
      previous: mockPrevious,
      seek: mockSeek,
      setVolume: mockSetVolume,
      skipTo: mockSkipTo,
      play: mockPlay,
      addToQueue: mockAddToQueue,
    })),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  },
}));

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      language: 'en',
      theme: 'dark',
      downloadPath: '/downloads',
      remoteControlEnabled: false,
      setRemoteControlEnabled: vi.fn(),
    })),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  },
}));

vi.mock('../store', () => ({
  useRemoteStore: {
    getState: vi.fn(() => ({
      serverInfo: null,
      starting: false,
      downloadingTrackIds: [],
      downloadedTrackIds: [],
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      markDownloading: vi.fn(),
      clearDownloading: vi.fn(),
      markDownloaded: vi.fn(),
    })),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  },
}));

import { dispatchCommand, buildRemoteState } from '../hooks/useRemoteBridge';

const mockTrack: RemoteTrack = {
  trackId: 42,
  trackUrl: 'https://api.soundcloud.com/tracks/42',
  title: 'Test Track',
  artist: 'Test Artist',
  artistId: 99,
  artworkUrl: null,
  durationMs: 180000,
  waveformUrl: null,
};

describe('dispatchCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches pause command', () => {
    dispatchCommand({ type: 'pause' });
    expect(mockPause).toHaveBeenCalled();
  });

  it('dispatches resume command', () => {
    dispatchCommand({ type: 'resume' });
    expect(mockResume).toHaveBeenCalled();
  });

  it('dispatches next command', () => {
    dispatchCommand({ type: 'next' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('dispatches previous command', () => {
    dispatchCommand({ type: 'previous' });
    expect(mockPrevious).toHaveBeenCalled();
  });

  it('dispatches seek command with positionMs', () => {
    dispatchCommand({ type: 'seek', positionMs: 5000 });
    expect(mockSeek).toHaveBeenCalledWith(5000);
  });

  it('dispatches setVolume command with volume', () => {
    dispatchCommand({ type: 'setVolume', volume: 0.5 });
    expect(mockSetVolume).toHaveBeenCalledWith(0.5);
  });

  it('dispatches skipTo command with index', () => {
    dispatchCommand({ type: 'skipTo', index: 3 });
    expect(mockSkipTo).toHaveBeenCalledWith(3);
  });

  it('dispatches playTrack command', () => {
    dispatchCommand({ type: 'playTrack', track: mockTrack });
    expect(mockPlay).toHaveBeenCalledWith([mockTrack], 0);
  });

  it('dispatches queueTrack command', () => {
    dispatchCommand({ type: 'queueTrack', track: mockTrack });
    expect(mockAddToQueue).toHaveBeenCalledWith(mockTrack);
  });

  it('dispatches downloadTrack command', () => {
    dispatchCommand({ type: 'downloadTrack', track: mockTrack });
    expect(mockDownloadTrackFull).toHaveBeenCalledWith({
      trackId: '42',
      trackUrl: mockTrack.trackUrl,
      title: mockTrack.title,
      artist: mockTrack.artist,
      artworkUrl: mockTrack.artworkUrl,
      durationMs: mockTrack.durationMs,
      downloadUrl: null,
      album: null,
      trackNumber: null,
      totalTracks: null,
      outputDir: '/downloads',
    });
  });
});

describe('buildRemoteState', () => {
  it('maps player store state to RemoteState shape', () => {
    const state = buildRemoteState();
    expect(state).toEqual({
      state: 'paused',
      currentTrack: null,
      positionMs: 1000,
      durationMs: 180000,
      volume: 0.8,
      queue: [],
      cursor: 0,
      language: 'en',
      theme: 'dark',
      downloadingTrackIds: [],
      downloadedTrackIds: [],
    });
  });
});
