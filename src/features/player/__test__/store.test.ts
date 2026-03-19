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

// Mock the url-cache so tests don't interfere via shared cache
vi.mock('../url-cache', () => ({
  getCachedUrl: vi.fn().mockReturnValue(null),
  setCachedUrl: vi.fn(),
  resolveWithCache: vi.fn().mockResolvedValue('https://example.com/stream.m3u8'),
  preloadQueueSegments: vi.fn(),
  purgeStaleCache: vi.fn(),
}));

import { usePlayerStore } from '../store';
import { audioEngine } from '../audio-engine';
import { resolveWithCache } from '../url-cache';
import type { PlaybackItem } from '../types';

const mockTrack: PlaybackItem = {
  trackId: 1,
  trackUrl: 'https://soundcloud.com/test/track-1',
  title: 'Test Track',
  artist: 'Test Artist',
  artworkUrl: null,
  durationMs: 180000,
  waveformUrl: null,
};

const makeQueue = (count = 3): PlaybackItem[] =>
  Array.from({ length: count }, (_, i) => ({
    ...mockTrack,
    trackId: i + 1,
    title: `Track ${i + 1}`,
  }));

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
      isShuffled: false,
      originalQueue: null,
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
    expect(resolveWithCache).toHaveBeenCalledWith(1, mockTrack.trackUrl);
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
    expect(resolveWithCache).toHaveBeenCalledWith(3, expect.any(String));
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
    expect(resolveWithCache).toHaveBeenCalledWith(2, queue[1]!.trackUrl);
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
    expect(resolveWithCache).toHaveBeenCalledWith(2, queue[1]!.trackUrl);
  });

  it('previous() at start should do nothing', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 0, state: 'playing' });
    await usePlayerStore.getState().previous();

    expect(usePlayerStore.getState().cursor).toBe(0);
    expect(resolveWithCache).not.toHaveBeenCalled();
  });

  it('toggleShuffle should shuffle queue and move current to front', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 2);

    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(true);
    expect(state.originalQueue).toEqual(queue);
    expect(state.cursor).toBe(0);
    expect(state.queue[0]!.trackId).toBe(queue[2]!.trackId);
    expect(state.queue.length).toBe(5);
  });

  it('toggleShuffle should restore original queue when disabled', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 2);

    usePlayerStore.getState().toggleShuffle();
    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(false);
    expect(state.originalQueue).toBeNull();
    expect(state.queue).toEqual(queue);
    expect(state.cursor).toBe(2);
  });

  it('toggleShuffle should be no-op for queue with 1 or fewer items', async () => {
    const queue = makeQueue(1);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(false);
    expect(state.queue).toEqual(queue);
  });

  it('play() should auto-shuffle when isShuffled is true', async () => {
    const queue1 = makeQueue(3);
    await usePlayerStore.getState().play(queue1, 0);
    usePlayerStore.getState().toggleShuffle();

    const queue2 = makeQueue(5);
    await usePlayerStore.getState().play(queue2, 2);

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(true);
    expect(state.originalQueue).toEqual(queue2);
    expect(state.cursor).toBe(0);
    expect(state.queue[0]!.trackId).toBe(queue2[2]!.trackId);
  });

  it('stop() should reset shuffle state', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 2);
    usePlayerStore.getState().toggleShuffle();

    usePlayerStore.getState().stop();

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(false);
    expect(state.originalQueue).toBeNull();
  });

  it('removeFromQueue should also remove from originalQueue when shuffled', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 2);
    usePlayerStore.getState().toggleShuffle();

    const stateAfterShuffle = usePlayerStore.getState();
    const trackToRemove = stateAfterShuffle.queue[3];

    usePlayerStore.getState().removeFromQueue(3);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(4);
    expect(state.originalQueue?.length).toBe(4);
    expect(state.originalQueue?.find((t) => t.trackId === trackToRemove?.trackId)).toBeUndefined();
  });

  it('skipTo should jump to track without reshuffling', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);
    usePlayerStore.getState().toggleShuffle();

    const stateAfterShuffle = usePlayerStore.getState();
    const shuffledQueue = [...stateAfterShuffle.queue];

    await usePlayerStore.getState().skipTo(3);

    const state = usePlayerStore.getState();
    expect(state.cursor).toBe(3);
    expect(state.currentTrack?.trackId).toBe(shuffledQueue[3]?.trackId);
    expect(state.queue).toEqual(shuffledQueue);
    expect(state.isShuffled).toBe(true);
  });

  it('skipTo should do nothing for invalid index', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 0);

    await usePlayerStore.getState().skipTo(10);

    const state = usePlayerStore.getState();
    expect(state.cursor).toBe(0);
  });

  it('syncQueue should update queue while preserving current track', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 1);

    const extendedQueue = makeQueue(5);
    usePlayerStore.getState().syncQueue(extendedQueue);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(5);
    expect(state.cursor).toBe(1);
    expect(state.currentTrack?.trackId).toBe(2);
  });

  it('syncQueue should do nothing when idle', () => {
    const queue = makeQueue(3);
    usePlayerStore.getState().syncQueue(queue);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(0);
    expect(state.state).toBe('stopped');
  });

  it('syncQueue should do nothing when current track not in new queue', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 1);

    const differentQueue = [
      { ...mockTrack, trackId: 10, title: 'Track 10' },
      { ...mockTrack, trackId: 11, title: 'Track 11' },
    ];
    usePlayerStore.getState().syncQueue(differentQueue);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(3);
    expect(state.cursor).toBe(1);
  });

  it('syncQueue should reshuffle when shuffle is active', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 1);
    usePlayerStore.getState().toggleShuffle();

    const extendedQueue = makeQueue(5);
    usePlayerStore.getState().syncQueue(extendedQueue);

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(true);
    expect(state.originalQueue).toEqual(extendedQueue);
    expect(state.cursor).toBe(0);
    expect(state.queue[0]?.trackId).toBe(2);
    expect(state.queue.length).toBe(5);
  });
});
