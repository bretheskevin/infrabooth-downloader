import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the audio engine
vi.mock('../audio-engine', () => ({
  audioEngine: {
    setCallbacks: vi.fn(),
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    getState: vi.fn().mockReturnValue('idle'),
    getPosition: vi.fn().mockReturnValue({ positionMs: 0, durationMs: 0 }),
  },
}));

// Mock the tauri API
vi.mock('@/lib/tauri', () => ({
  api: {
    resolvePlaybackUrl: vi.fn().mockResolvedValue('https://example.com/stream.m3u8'),
  },
}));

// Mock the url-cache so tests don't interfere via shared cache
vi.mock('../url-cache', () => ({
  getCachedUrl: vi.fn().mockReturnValue(null),
  setCachedUrl: vi.fn(),
}));

import { usePlayerStore } from '../store';
import { audioEngine } from '../audio-engine';
import { api } from '@/lib/tauri';
import type { PlaybackItem } from '../types';

const mockTrack: PlaybackItem = {
  trackId: 1,
  trackUrl: 'https://soundcloud.com/test/track-1',
  title: 'Test Track',
  artist: 'Test Artist',
  artworkUrl: null,
  durationMs: 180000,
};

const makeQueue = (): PlaybackItem[] => [
  { ...mockTrack, trackId: 1, title: 'Track 1' },
  { ...mockTrack, trackId: 2, title: 'Track 2' },
  { ...mockTrack, trackId: 3, title: 'Track 3' },
];

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      state: 'stopped',
      currentTrack: null,
      queue: [],
      cursor: 0,
      positionMs: 0,
      durationMs: 0,
      volume: 1.0,
      isExpanded: false,
      isQueueOpen: false,
    });
    vi.clearAllMocks();
  });

  it('should have correct initial state', () => {
    const state = usePlayerStore.getState();
    expect(state.state).toBe('stopped');
    expect(state.volume).toBe(1.0);
    expect(state.queue).toEqual([]);
    expect(state.currentTrack).toBeNull();
  });

  it('play() should set loading state and resolve URL', async () => {
    const queue = [mockTrack];
    await usePlayerStore.getState().play(queue, 0);
    expect(api.resolvePlaybackUrl).toHaveBeenCalledWith(1, mockTrack.trackUrl);
    expect(audioEngine.load).toHaveBeenCalledWith('https://example.com/stream.m3u8');
    expect(audioEngine.play).toHaveBeenCalled();
  });

  it('play() should set queue and current track optimistically', async () => {
    const queue = [mockTrack];
    const promise = usePlayerStore.getState().play(queue, 0);
    // Check optimistic state before resolve completes
    const state = usePlayerStore.getState();
    expect(state.queue).toEqual(queue);
    expect(state.cursor).toBe(0);
    expect(state.currentTrack).toEqual(mockTrack);
    await promise;
  });

  it('pause() should call audio engine', () => {
    usePlayerStore.getState().pause();
    expect(audioEngine.pause).toHaveBeenCalled();
  });

  it('resume() should call audio engine', () => {
    usePlayerStore.getState().resume();
    expect(audioEngine.resume).toHaveBeenCalled();
  });

  it('seek() should call audio engine and update state', () => {
    usePlayerStore.getState().seek(5000);
    expect(audioEngine.seek).toHaveBeenCalledWith(5000);
    expect(usePlayerStore.getState().positionMs).toBe(5000);
  });

  it('stop() should call audio engine and reset state', () => {
    usePlayerStore.setState({ state: 'playing', queue: makeQueue(), cursor: 1 });
    usePlayerStore.getState().stop();
    expect(audioEngine.stop).toHaveBeenCalled();
    const state = usePlayerStore.getState();
    expect(state.state).toBe('stopped');
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toEqual([]);
  });

  it('setVolume() should call audio engine and update state', () => {
    usePlayerStore.getState().setVolume(0.5);
    expect(audioEngine.setVolume).toHaveBeenCalledWith(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);
  });

  it('toggleExpanded should toggle isExpanded', () => {
    expect(usePlayerStore.getState().isExpanded).toBe(false);
    usePlayerStore.getState().toggleExpanded();
    expect(usePlayerStore.getState().isExpanded).toBe(true);
  });

  it('toggleQueue should toggle isQueueOpen', () => {
    expect(usePlayerStore.getState().isQueueOpen).toBe(false);
    usePlayerStore.getState().toggleQueue();
    expect(usePlayerStore.getState().isQueueOpen).toBe(true);
  });

  it('reorderQueue should update queue and cursor', () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 0 });
    usePlayerStore.getState().reorderQueue(0, 2);

    const state = usePlayerStore.getState();
    expect(state.queue[0]!.trackId).toBe(2);
    expect(state.queue[1]!.trackId).toBe(3);
    expect(state.queue[2]!.trackId).toBe(1);
    expect(state.cursor).toBe(2);
    expect(state.currentTrack!.trackId).toBe(1);
  });

  it('removeFromQueue should update queue', () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 2 });
    usePlayerStore.getState().removeFromQueue(0);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(2);
    expect(state.cursor).toBe(1);
    expect(state.currentTrack!.trackId).toBe(3);
  });

  it('removeFromQueue should auto-play new current when removing current track', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 1, state: 'playing' });
    usePlayerStore.getState().removeFromQueue(1);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(2);
    expect(state.cursor).toBe(1);
    expect(state.currentTrack!.trackId).toBe(3);
    expect(state.state).toBe('loading');
    expect(api.resolvePlaybackUrl).toHaveBeenCalledWith(3, expect.any(String));
  });

  it('removeFromQueue should stop when queue becomes empty', () => {
    const queue = [mockTrack];
    usePlayerStore.setState({ queue, cursor: 0, state: 'playing' });
    usePlayerStore.getState().removeFromQueue(0);

    const state = usePlayerStore.getState();
    expect(state.queue).toEqual([]);
    expect(state.state).toBe('stopped');
    expect(audioEngine.stop).toHaveBeenCalled();
  });

  it('next() should advance cursor and resolve next track', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 0, state: 'playing' });
    await usePlayerStore.getState().next();

    expect(usePlayerStore.getState().cursor).toBe(1);
    expect(api.resolvePlaybackUrl).toHaveBeenCalledWith(2, queue[1]!.trackUrl);
    expect(audioEngine.load).toHaveBeenCalled();
  });

  it('next() at end of queue should stop', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 2, state: 'playing' });
    await usePlayerStore.getState().next();

    expect(usePlayerStore.getState().state).toBe('stopped');
    expect(audioEngine.stop).toHaveBeenCalled();
  });

  it('previous() should go back and resolve previous track', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 2, state: 'playing' });
    await usePlayerStore.getState().previous();

    expect(usePlayerStore.getState().cursor).toBe(1);
    expect(api.resolvePlaybackUrl).toHaveBeenCalledWith(2, queue[1]!.trackUrl);
  });

  it('previous() at start should do nothing', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 0, state: 'playing' });
    await usePlayerStore.getState().previous();

    expect(usePlayerStore.getState().cursor).toBe(0);
    expect(api.resolvePlaybackUrl).not.toHaveBeenCalled();
  });
});
