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
import { useSettingsStore } from '@/features/settings/store';
import { usePlayerStore } from '../store';
import { flushPlayerCommands } from '../player-commands';
import { handleDockSetting, subscribeDockMenu, toDockMenuState, type DockSettingTarget } from '../utils/dockMenu';
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

const t = (key: string, options?: { count: number }) => (options ? `${key}:${options.count}` : key);
const defaultSettings = { crossfadeEnabled: false, crossfadeDuration: 5, maxConcurrentDownloads: 3 };

describe('dock menu state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({ currentTrack: null, state: 'stopped', isShuffled: false, positionMs: 0 });
    useSettingsStore.setState(defaultSettings);
  });

  it('builds the state for a playing track with settings and translated labels', () => {
    const settings = { crossfadeEnabled: true, crossfadeDuration: 7, maxConcurrentDownloads: 1 };
    expect(toDockMenuState({ currentTrack: track, state: 'playing', isShuffled: true }, settings, t)).toEqual({
      title: 'Song — Artist',
      isPlaying: true,
      hasTrack: true,
      shuffle: true,
      settings: { crossfadeEnabled: true, crossfadeDuration: 7, maxConcurrentDownloads: 1 },
      labels: {
        play: 'player.play',
        pause: 'player.pause',
        next: 'player.next',
        previous: 'player.previous',
        shuffle: 'player.shuffle',
        notPlaying: 'player.notPlaying',
        settingsMenu: 'settings.title',
        crossfade: 'settings.crossfade',
        crossfadeDuration: 'player.dockCrossfadeDuration',
        crossfadeSeconds: Array.from({ length: 12 }, (_, i) => `settings.crossfadeSeconds:${i + 1}`),
        parallelDownloads: 'player.dockParallelDownloads',
        sequential: 'player.dockSequential',
      },
    });
  });

  it('reports no track when nothing is loaded', () => {
    const state = toDockMenuState({ currentTrack: null, state: 'stopped', isShuffled: false }, defaultSettings, t);
    expect(state.title).toBeNull();
    expect(state.hasTrack).toBe(false);
    expect(state.isPlaying).toBe(false);
  });

  it('treats loading as playing so the menu offers Pause', () => {
    expect(toDockMenuState({ currentTrack: track, state: 'loading', isShuffled: false }, defaultSettings, t).isPlaying).toBe(true);
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

  it('rounds settings values so Rust receives integers', () => {
    const state = toDockMenuState(
      { currentTrack: null, state: 'stopped', isShuffled: false },
      { crossfadeEnabled: false, crossfadeDuration: 4.6, maxConcurrentDownloads: 2.2 },
      t,
    );
    expect(state.settings).toEqual({ crossfadeEnabled: false, crossfadeDuration: 5, maxConcurrentDownloads: 2 });
  });

  it('pushes again when a dock-relevant setting changes', async () => {
    const unsubscribe = subscribeDockMenu();
    useSettingsStore.setState({ crossfadeEnabled: true });
    useSettingsStore.setState({ maxConcurrentDownloads: 1 });
    await flushPlayerCommands();

    const pushed = vi.mocked(commands.playerSetDockState).mock.calls.map(([s]) => s.settings);
    expect(pushed).toEqual([
      { crossfadeEnabled: false, crossfadeDuration: 5, maxConcurrentDownloads: 3 },
      { crossfadeEnabled: true, crossfadeDuration: 5, maxConcurrentDownloads: 3 },
      { crossfadeEnabled: true, crossfadeDuration: 5, maxConcurrentDownloads: 1 },
    ]);
    unsubscribe();
  });
});

describe('dock setting actions', () => {
  const makeTarget = (): DockSettingTarget => ({
    setCrossfadeEnabled: vi.fn(),
    setCrossfadeDuration: vi.fn(),
    setMaxConcurrentDownloads: vi.fn(),
  });

  it('applies the crossfade toggle value', () => {
    const target = makeTarget();
    handleDockSetting({ type: 'setCrossfade', enabled: true }, target);
    expect(target.setCrossfadeEnabled).toHaveBeenCalledWith(true);
    expect(target.setCrossfadeDuration).not.toHaveBeenCalled();
  });

  it('applies the crossfade duration', () => {
    const target = makeTarget();
    handleDockSetting({ type: 'setCrossfadeDuration', seconds: 9 }, target);
    expect(target.setCrossfadeDuration).toHaveBeenCalledWith(9);
  });

  it('applies the parallel downloads count', () => {
    const target = makeTarget();
    handleDockSetting({ type: 'setMaxConcurrentDownloads', count: 1 }, target);
    expect(target.setMaxConcurrentDownloads).toHaveBeenCalledWith(1);
  });

  it('updates the real settings store through its setters', () => {
    handleDockSetting({ type: 'setCrossfadeDuration', seconds: 12 }, useSettingsStore.getState());
    expect(useSettingsStore.getState().crossfadeDuration).toBe(12);
  });
});
