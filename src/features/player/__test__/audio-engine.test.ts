import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listen } from '@tauri-apps/api/event';
import { error as logError } from '@tauri-apps/plugin-log';

vi.mock('@/bindings', () => {
  const ok = () => vi.fn().mockResolvedValue({ status: 'ok', data: null });
  return {
    commands: {
      playerLoad: ok(),
      playerPlay: ok(),
      playerPause: ok(),
      playerSeek: ok(),
      playerSetVolume: ok(),
      playerStop: ok(),
      playerDestroy: ok(),
      playerPreloadNext: ok(),
      playerStartCrossfade: ok(),
      playerCancelCrossfade: ok(),
      playerSettleCrossfade: ok(),
    },
  };
});

type Handler = (event: { payload: unknown }) => void;
const handlers = new Map<string, Handler>();
vi.mocked(listen).mockImplementation(async (name, handler) => {
  handlers.set(name as string, handler as unknown as Handler);
  return () => {};
});

import { commands } from '@/bindings';
import { audioEngine, PLAYER_EVENTS, type AudioEngineCallbacks } from '../audio-engine';
import { flushPlayerCommands } from '../player-commands';

function makeCallbacks(): AudioEngineCallbacks {
  return {
    onStateChange: vi.fn(),
    onProgress: vi.fn(),
    onEnded: vi.fn(),
    onError: vi.fn(),
    onFullyBuffered: vi.fn(),
    onCrossfadeComplete: vi.fn(),
    onUrlExpired: vi.fn(),
  };
}

function emit(name: string, payload: Record<string, unknown>) {
  const handler = handlers.get(name);
  if (!handler) throw new Error(`no listener for ${name}`);
  handler({ payload });
}

async function loadAndGetGeneration(url = 'https://cdn/a.mp3', start = 0): Promise<number> {
  audioEngine.load(url, start);
  await flushPlayerCommands();
  return vi.mocked(commands.playerLoad).mock.lastCall![2];
}

let cb: AudioEngineCallbacks;

describe('audioEngine (native wrapper)', () => {
  beforeEach(async () => {
    audioEngine.destroy();
    cb = makeCallbacks();
    audioEngine.setCallbacks(cb);
    await flushPlayerCommands();
    vi.clearAllMocks();
  });

  it('starts idle with zero position and no crossfade', () => {
    expect(audioEngine.getState()).toBe('idle');
    expect(audioEngine.getPosition()).toEqual({ positionMs: 0, durationMs: 0 });
    expect(audioEngine.isCrossfading()).toBe(false);
    expect(audioEngine.isFullyBuffered()).toBe(false);
  });

  it('load reports loading synchronously and sends playerLoad with a new generation', async () => {
    const gen = await loadAndGetGeneration('https://cdn/x.m3u8', 42000);
    expect(cb.onStateChange).toHaveBeenCalledWith('loading');
    expect(audioEngine.getState()).toBe('loading');
    expect(commands.playerLoad).toHaveBeenCalledWith('https://cdn/x.m3u8', 42000, gen);
    expect(audioEngine.getPosition().positionMs).toBe(42000);
  });

  it('sends commands in call order', async () => {
    audioEngine.load('https://cdn/a.mp3');
    audioEngine.play();
    audioEngine.setVolume(0.4);
    await flushPlayerCommands();
    const order = [commands.playerLoad, commands.playerPlay, commands.playerSetVolume].map(
      (fn) => vi.mocked(fn).mock.invocationCallOrder[0]!,
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('maps current-generation events to callbacks', async () => {
    const gen = await loadAndGetGeneration();
    emit(PLAYER_EVENTS.stateChanged, { loadGeneration: gen, state: 'playing' });
    emit(PLAYER_EVENTS.progress, { loadGeneration: gen, positionMs: 1000, durationMs: 9000 });
    emit(PLAYER_EVENTS.fullyBuffered, { loadGeneration: gen });
    emit(PLAYER_EVENTS.urlExpired, { loadGeneration: gen, positionMs: 1500 });
    emit(PLAYER_EVENTS.error, { loadGeneration: gen, message: 'boom' });
    emit(PLAYER_EVENTS.ended, { loadGeneration: gen });
    emit(PLAYER_EVENTS.crossfadeComplete, { loadGeneration: gen });
    expect(cb.onStateChange).toHaveBeenLastCalledWith('playing');
    expect(cb.onProgress).toHaveBeenCalledWith(1000, 9000);
    expect(cb.onFullyBuffered).toHaveBeenCalled();
    expect(cb.onUrlExpired).toHaveBeenCalledWith(1500);
    expect(cb.onError).toHaveBeenCalledWith('boom');
    expect(cb.onEnded).toHaveBeenCalled();
    expect(cb.onCrossfadeComplete).toHaveBeenCalled();
  });

  it('drops events from a superseded generation', async () => {
    const stale = await loadAndGetGeneration('https://cdn/a.mp3');
    await loadAndGetGeneration('https://cdn/b.mp3');
    vi.mocked(cb.onProgress).mockClear();
    emit(PLAYER_EVENTS.progress, { loadGeneration: stale, positionMs: 5, durationMs: 10 });
    emit(PLAYER_EVENTS.ended, { loadGeneration: stale });
    expect(cb.onProgress).not.toHaveBeenCalled();
    expect(cb.onEnded).not.toHaveBeenCalled();
  });

  it('forwards current-generation spectrum frames and drops superseded ones', async () => {
    const listener = vi.fn();
    audioEngine.setSpectrumListener(listener);
    const stale = await loadAndGetGeneration('https://cdn/a.mp3');
    const gen = await loadAndGetGeneration('https://cdn/b.mp3');
    emit(PLAYER_EVENTS.spectrum, { loadGeneration: stale, bands: [0.9] });
    emit(PLAYER_EVENTS.spectrum, { loadGeneration: gen, bands: [0.5, 0.25] });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([0.5, 0.25]);
    audioEngine.setSpectrumListener(null);
  });

  it('does not re-fire onStateChange for a duplicate state', async () => {
    const gen = await loadAndGetGeneration();
    vi.mocked(cb.onStateChange).mockClear();
    emit(PLAYER_EVENTS.stateChanged, { loadGeneration: gen, state: 'loading' });
    expect(cb.onStateChange).not.toHaveBeenCalled();
  });

  it('interpolates position while playing and freezes it when paused', async () => {
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    const gen = await loadAndGetGeneration();
    emit(PLAYER_EVENTS.stateChanged, { loadGeneration: gen, state: 'playing' });
    emit(PLAYER_EVENTS.progress, { loadGeneration: gen, positionMs: 2000, durationMs: 9000 });
    now.mockReturnValue(1400);
    expect(audioEngine.getPosition()).toEqual({ positionMs: 2400, durationMs: 9000 });
    emit(PLAYER_EVENTS.stateChanged, { loadGeneration: gen, state: 'paused' });
    now.mockReturnValue(5000);
    expect(audioEngine.getPosition().positionMs).toBe(2400);
    now.mockRestore();
  });

  it('clears fully-buffered on load', async () => {
    const gen = await loadAndGetGeneration();
    emit(PLAYER_EVENTS.fullyBuffered, { loadGeneration: gen });
    expect(audioEngine.isFullyBuffered()).toBe(true);
    audioEngine.load('https://cdn/next.mp3');
    expect(audioEngine.isFullyBuffered()).toBe(false);
  });

  it('isCrossfading is optimistic and needs a standby', async () => {
    const gen = await loadAndGetGeneration();
    audioEngine.startCrossfade(3000, 1);
    expect(audioEngine.isCrossfading()).toBe(false);
    audioEngine.preloadNext('https://cdn/next.mp3');
    audioEngine.startCrossfade(3000, 1);
    expect(audioEngine.isCrossfading()).toBe(true);
    audioEngine.cancelCrossfade();
    expect(audioEngine.isCrossfading()).toBe(false);
    audioEngine.preloadNext('https://cdn/next.mp3');
    audioEngine.startCrossfade(3000, 1);
    emit(PLAYER_EVENTS.crossfadeComplete, { loadGeneration: gen });
    expect(audioEngine.isCrossfading()).toBe(false);
    audioEngine.preloadNext('https://cdn/next.mp3');
    audioEngine.startCrossfade(3000, 1);
    audioEngine.settleCrossfade();
    expect(audioEngine.isCrossfading()).toBe(false);
    await flushPlayerCommands();
    expect(commands.playerStartCrossfade).toHaveBeenCalledTimes(3);
  });

  it('ended clears an optimistic crossfade that never began', async () => {
    const gen = await loadAndGetGeneration();
    audioEngine.preloadNext('https://cdn/next.mp3');
    audioEngine.startCrossfade(3000, 1);
    let crossfadingWhenEnded: boolean | null = null;
    vi.mocked(cb.onEnded).mockImplementation(() => {
      crossfadingWhenEnded = audioEngine.isCrossfading();
    });
    emit(PLAYER_EVENTS.ended, { loadGeneration: gen });
    expect(crossfadingWhenEnded).toBe(false);
  });

  it('seek while playing reports loading synchronously', async () => {
    const gen = await loadAndGetGeneration();
    emit(PLAYER_EVENTS.stateChanged, { loadGeneration: gen, state: 'playing' });
    audioEngine.seek(5000);
    expect(audioEngine.getState()).toBe('loading');
    await flushPlayerCommands();
    expect(commands.playerSeek).toHaveBeenCalledWith(5000);
  });

  it('clamps volume', async () => {
    audioEngine.setVolume(1.5);
    audioEngine.setVolume(-0.5);
    await flushPlayerCommands();
    expect(vi.mocked(commands.playerSetVolume).mock.calls).toEqual([[1], [0]]);
  });

  it('stop reports idle, bumps generation and resets position', async () => {
    const gen = await loadAndGetGeneration('https://cdn/a.mp3', 3000);
    audioEngine.stop();
    expect(audioEngine.getState()).toBe('idle');
    expect(audioEngine.getPosition()).toEqual({ positionMs: 0, durationMs: 0 });
    await flushPlayerCommands();
    expect(vi.mocked(commands.playerStop).mock.lastCall![0]).toBe(gen + 1);
  });

  it('logs command failures through the logger', async () => {
    vi.mocked(commands.playerPlay).mockResolvedValueOnce({
      status: 'error',
      error: { code: 'PLAYER_ENGINE_UNAVAILABLE', message: 'gone' },
    });
    audioEngine.play();
    await flushPlayerCommands();
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('playerPlay failed: PLAYER_ENGINE_UNAVAILABLE gone'));
  });
});
