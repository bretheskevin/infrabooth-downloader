import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/bindings', () => ({
  commands: {
    playerSetDockState: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}));

vi.mock('../audio-engine', () => ({
  audioEngine: {
    setCallbacks: vi.fn(),
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    isCrossfading: vi.fn().mockReturnValue(false),
    cancelCrossfade: vi.fn(),
  },
}));

vi.mock('../url-cache', () => ({
  getCachedUrl: vi.fn().mockReturnValue(null),
  resolveWithCache: vi.fn(),
  preloadQueueSegments: vi.fn(),
  purgeStaleCache: vi.fn(),
  invalidateCachedUrl: vi.fn(),
}));

import { commands } from '@/bindings';
import { usePlayerStore } from '../store';
import { flushPlayerCommands } from '../player-commands';
import { subscribeDockMenu, toDockMenuState } from '../utils/dockMenu';
import type { PlaybackItem } from '../types';

const track: PlaybackItem = {
  trackId: 7,
  trackUrl: 'https://soundcloud.com/test/track-7',
  title: 'Song',
  artist: 'Artist',
  artistId: 1,
  artworkUrl: null,
  durationMs: 1000,
  waveformUrl: null,
};

const t = (key: string) => key;

describe('dock menu state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({ currentTrack: null, state: 'stopped', isShuffled: false, positionMs: 0 });
  });

  it('builds the state for a playing track with translated labels', () => {
    expect(toDockMenuState({ currentTrack: track, state: 'playing', isShuffled: true }, t)).toEqual({
      title: 'Song — Artist',
      isPlaying: true,
      hasTrack: true,
      shuffle: true,
      labels: {
        play: 'player.play',
        pause: 'player.pause',
        next: 'player.next',
        previous: 'player.previous',
        shuffle: 'player.shuffle',
        notPlaying: 'player.notPlaying',
      },
    });
  });

  it('reports no track when nothing is loaded', () => {
    const state = toDockMenuState({ currentTrack: null, state: 'stopped', isShuffled: false }, t);
    expect(state.title).toBeNull();
    expect(state.hasTrack).toBe(false);
    expect(state.isPlaying).toBe(false);
  });

  it('treats loading as playing so the menu offers Pause', () => {
    expect(toDockMenuState({ currentTrack: track, state: 'loading', isShuffled: false }, t).isPlaying).toBe(true);
  });

  it('pushes on subscribe and on relevant changes only, then stops after unsubscribe', async () => {
    const unsubscribe = subscribeDockMenu();
    usePlayerStore.setState({ positionMs: 1234 });
    usePlayerStore.setState({ isShuffled: true });
    await flushPlayerCommands();

    const pushed = vi.mocked(commands.playerSetDockState).mock.calls.map(([s]) => s.shuffle);
    expect(pushed).toEqual([false, true]);

    unsubscribe();
    usePlayerStore.setState({ isShuffled: false });
    await flushPlayerCommands();
    expect(commands.playerSetDockState).toHaveBeenCalledTimes(2);
  });
});
