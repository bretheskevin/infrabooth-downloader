import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import type { RemoteTrack } from '@/lib/remote-protocol';
import { createQueryWrapper } from '@/test/queryWrapper';

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
  mockToggleShuffle,
  mockDownloadTrackFull,
  mockIsLocalApiActive,
  mockPushRemoteState,
  remoteStoreState,
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
  mockToggleShuffle: vi.fn(),
  mockDownloadTrackFull: vi.fn().mockResolvedValue({ status: 'ok' }),
  mockIsLocalApiActive: vi.fn().mockResolvedValue(false),
  mockPushRemoteState: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  remoteStoreState: { serverInfo: null as { url: string; port: number; token: string } | null },
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
    isLocalApiActive: mockIsLocalApiActive,
    pushRemoteState: mockPushRemoteState,
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
      isShuffled: true,
      manualQueueCount: 2,
      stationQueueCount: 3,
      pause: mockPause,
      resume: mockResume,
      next: mockNext,
      previous: mockPrevious,
      seek: mockSeek,
      setVolume: mockSetVolume,
      skipTo: mockSkipTo,
      play: mockPlay,
      addToQueue: mockAddToQueue,
      toggleShuffle: mockToggleShuffle,
    })),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  },
}));

vi.mock('@/features/settings/store', () => {
  const getState = vi.fn(() => ({
    language: 'en',
    theme: 'dark',
    downloadPath: '/downloads',
    remoteControlEnabled: false,
    setRemoteControlEnabled: vi.fn(),
  }));
  const useSettingsStore = Object.assign((selector: (s: ReturnType<typeof getState>) => unknown) => selector(getState()), {
    getState,
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  });
  return { useSettingsStore };
});

vi.mock('../store', () => {
  const getState = vi.fn(() => ({
    serverInfo: remoteStoreState.serverInfo,
    starting: false,
    downloadingTrackIds: [],
    downloadedTrackIds: [],
    enable: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
    markDownloading: vi.fn(),
    clearDownloading: vi.fn(),
    markDownloaded: vi.fn(),
  }));
  const useRemoteStore = Object.assign((selector: (s: ReturnType<typeof getState>) => unknown) => selector(getState()), {
    getState,
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  });
  return { useRemoteStore };
});

import { usePlayerStore } from '@/features/player/store';
import { dispatchCommand, buildRemoteState, useRemoteBridge } from '../hooks/useRemoteBridge';

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

  it('dispatches playTracks command', () => {
    dispatchCommand({ type: 'playTracks', tracks: [mockTrack], startIndex: 0 });
    expect(mockPlay).toHaveBeenCalledWith([mockTrack], 0);
  });

  it('dispatches queueTrack command', () => {
    dispatchCommand({ type: 'queueTrack', track: mockTrack });
    expect(mockAddToQueue).toHaveBeenCalledWith(mockTrack);
  });

  it('dispatches queueTracks command by queueing each track in order', () => {
    const second = { ...mockTrack, trackId: 43 };
    dispatchCommand({ type: 'queueTracks', tracks: [mockTrack, second] });
    expect(mockAddToQueue).toHaveBeenNthCalledWith(1, mockTrack);
    expect(mockAddToQueue).toHaveBeenNthCalledWith(2, second);
  });

  it('dispatches toggleShuffle command', () => {
    dispatchCommand({ type: 'toggleShuffle' });
    expect(mockToggleShuffle).toHaveBeenCalled();
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
      secretToken: null,
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
      shuffle: true,
      manualQueueCount: 2,
      stationQueueCount: 3,
      language: 'en',
      theme: 'dark',
      downloadingTrackIds: [],
      downloadedTrackIds: [],
      isSignedIn: false,
    });
  });
});

describe('useRemoteBridge activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLocalApiActive.mockResolvedValue(false);
    remoteStoreState.serverInfo = null;
  });

  it('activates via the local API when the phone remote is off', async () => {
    mockIsLocalApiActive.mockResolvedValue(true);
    renderHook(() => useRemoteBridge(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(mockPushRemoteState).toHaveBeenCalled());
    expect(listen).toHaveBeenCalledWith('remote-command', expect.any(Function));
  });

  it('activates via the phone remote when the local API is inactive', async () => {
    remoteStoreState.serverInfo = { url: 'http://192.168.1.2:1234/?t=x', port: 1234, token: 'x' };
    renderHook(() => useRemoteBridge(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(mockPushRemoteState).toHaveBeenCalled());
    expect(listen).toHaveBeenCalledWith('remote-command', expect.any(Function));
  });

  it('stays inactive when neither the phone remote nor the local API is running', async () => {
    const { result } = renderHook(
      () => {
        useRemoteBridge();
        return useQueryClient().getQueryState(['remote', 'localApiActive'])?.status;
      },
      { wrapper: createQueryWrapper() },
    );
    await waitFor(() => expect(result.current).toBe('success'));
    expect(mockPushRemoteState).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  it.each([
    { field: 'isShuffled', next: true, prev: false },
    { field: 'manualQueueCount', next: 1, prev: 0 },
    { field: 'stationQueueCount', next: 5, prev: 0 },
  ] as const)('pushes immediately when only $field changes', async ({ field, next, prev }) => {
    mockIsLocalApiActive.mockResolvedValue(true);
    renderHook(() => useRemoteBridge(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(usePlayerStore.subscribe).toHaveBeenCalled());
    const listener = vi.mocked(usePlayerStore.subscribe).mock.calls[0]?.[0];
    if (!listener) throw new Error('player store subscriber was not registered');
    mockPushRemoteState.mockClear();
    const base = usePlayerStore.getState();
    listener({ ...base, [field]: next }, { ...base, [field]: prev });
    expect(mockPushRemoteState).toHaveBeenCalledTimes(1);
  });
});
