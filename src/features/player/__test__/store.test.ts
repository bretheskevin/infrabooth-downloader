import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the audio engine
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
    getState: vi.fn().mockReturnValue('idle'),
    getPosition: vi.fn().mockReturnValue({ positionMs: 0, durationMs: 0 }),
    preloadNext: vi.fn(),
    startCrossfade: vi.fn(),
    cancelCrossfade: vi.fn(),
    settleCrossfade: vi.fn(),
    isCrossfading: vi.fn().mockReturnValue(false),
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

vi.mock('@/lib/tauri', () => ({
  api: {
    fetchRelatedTracks: vi.fn().mockResolvedValue([]),
  },
}));

import { usePlayerStore } from '../store';
import { resetCrossfadeGeneration } from '../store/playbackSlice';
import { audioEngine } from '../audio-engine';
import { resolveWithCache, preloadQueueSegments } from '../url-cache';
import { useSettingsStore } from '@/features/settings/store';
import type { PlaybackItem } from '../types';
import type { AudioEngineCallbacks } from '../audio-engine';

const mockTrack: PlaybackItem = {
  trackId: 1,
  trackUrl: 'https://soundcloud.com/test/track-1',
  title: 'Test Track',
  artist: 'Test Artist',
  artistId: 1,
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

const mockStationTracks: PlaybackItem[] = [
  { ...mockTrack, trackId: 101, title: 'Station 1' },
  { ...mockTrack, trackId: 102, title: 'Station 2' },
];

function extractCallbacks(): Partial<AudioEngineCallbacks> {
  usePlayerStore.getState()._initAudioEngine();
  const calls = (audioEngine.setCallbacks as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1]![0] as Partial<AudioEngineCallbacks>;
}

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
      manualQueueCount: 0,
      stationQueueCount: 0,
      autoplayInFlight: false,
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

  it('resume() should call audio engine play', () => {
    usePlayerStore.getState().resume();
    expect(audioEngine.play).toHaveBeenCalled();
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

  it('addToQueue inserts after cursor when playing', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 1);

    const newItem: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Added Track' };
    usePlayerStore.getState().addToQueue(newItem);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(4);
    expect(state.queue[2]?.trackId).toBe(99);
    expect(state.cursor).toBe(1);
  });

  it('addToQueue starts playback when stopped', () => {
    const newItem: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Added Track' };
    usePlayerStore.getState().addToQueue(newItem);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(1);
    expect(state.queue[0]?.trackId).toBe(99);
    expect(state.state).toBe('loading');
  });

  it('addToQueue appends to originalQueue when shuffled', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 0);
    usePlayerStore.getState().toggleShuffle();

    const newItem: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Added Track' };
    usePlayerStore.getState().addToQueue(newItem);

    const state = usePlayerStore.getState();
    expect(state.originalQueue).toBeTruthy();
    expect(state.originalQueue![state.originalQueue!.length - 1]?.trackId).toBe(99);
  });

  it('addToQueue sets manualQueueCount to 1 on first add', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 1);

    const newItem: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Added Track' };
    usePlayerStore.getState().addToQueue(newItem);

    expect(usePlayerStore.getState().manualQueueCount).toBe(1);
  });

  it('addToQueue stacks manual tracks in order', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 1);

    const trackX: PlaybackItem = { ...mockTrack, trackId: 98, title: 'Track X' };
    const trackY: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Track Y' };
    usePlayerStore.getState().addToQueue(trackX);
    usePlayerStore.getState().addToQueue(trackY);

    const state = usePlayerStore.getState();
    expect(state.manualQueueCount).toBe(2);
    expect(state.queue[2]?.trackId).toBe(98);
    expect(state.queue[3]?.trackId).toBe(99);
    expect(state.queue[4]?.trackId).toBe(3);
  });

  it('addToQueue resets manualQueueCount when starting playback from stopped', () => {
    const newItem: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Added Track' };
    usePlayerStore.getState().addToQueue(newItem);

    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
  });

  it('play preserves manually queued tracks in the new queue', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 0);

    const manualTrack: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Manual Track' };
    usePlayerStore.getState().addToQueue(manualTrack);
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);

    const newQueue = makeQueue(5);
    await usePlayerStore.getState().play(newQueue, 2);

    const state = usePlayerStore.getState();
    expect(state.manualQueueCount).toBe(1);
    expect(state.cursor).toBe(2);
    expect(state.queue[3]?.trackId).toBe(99);
    expect(state.queue.length).toBe(6);
  });

  it('play with no manual tracks sets manualQueueCount to 0', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 0);
    await usePlayerStore.getState().play(makeQueue(5), 0);
    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
  });

  it('play preserves multiple manual tracks in order', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 1);

    const trackX: PlaybackItem = { ...mockTrack, trackId: 98, title: 'Track X' };
    const trackY: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Track Y' };
    usePlayerStore.getState().addToQueue(trackX);
    usePlayerStore.getState().addToQueue(trackY);
    expect(usePlayerStore.getState().manualQueueCount).toBe(2);

    const newQueue = makeQueue(3);
    await usePlayerStore.getState().play(newQueue, 0);

    const state = usePlayerStore.getState();
    expect(state.manualQueueCount).toBe(2);
    expect(state.queue[1]?.trackId).toBe(98);
    expect(state.queue[2]?.trackId).toBe(99);
    expect(state.queue[0]?.trackId).toBe(1);
    expect(state.queue.length).toBe(5);
  });

  it('play with shuffle preserves manual tracks and includes them in originalQueue', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 0);
    usePlayerStore.getState().toggleShuffle();

    const manualTrack: PlaybackItem = { ...mockTrack, trackId: 99, title: 'Manual Track' };
    usePlayerStore.getState().addToQueue(manualTrack);
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);

    const newQueue = makeQueue(5);
    await usePlayerStore.getState().play(newQueue, 2);

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(true);
    expect(state.manualQueueCount).toBe(1);
    expect(state.queue[0]!.trackId).toBe(newQueue[2]!.trackId);
    expect(state.queue[1]?.trackId).toBe(99);
    expect(state.originalQueue).toBeTruthy();
    expect(state.originalQueue!.some((t) => t.trackId === 99)).toBe(true);
  });

  it('next decrements manualQueueCount when advancing into manual section', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 99 });
    expect(usePlayerStore.getState().manualQueueCount).toBe(2);

    await usePlayerStore.getState().next();
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);
    expect(usePlayerStore.getState().currentTrack?.trackId).toBe(98);

    await usePlayerStore.getState().next();
    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
    expect(usePlayerStore.getState().currentTrack?.trackId).toBe(99);
  });

  it('skipTo resets manualQueueCount when skipping past manual section', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 99 });
    expect(usePlayerStore.getState().manualQueueCount).toBe(2);

    await usePlayerStore.getState().skipTo(4);
    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
  });

  it('skipTo within manual section adjusts manualQueueCount', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 99 });

    await usePlayerStore.getState().skipTo(1);
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);
    expect(usePlayerStore.getState().currentTrack?.trackId).toBe(98);
  });

  it('removeFromQueue decrements manualQueueCount when removing manual track', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 99 });

    usePlayerStore.getState().removeFromQueue(1);
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);
  });

  it('removeFromQueue does not change manualQueueCount when removing auto track', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });

    usePlayerStore.getState().removeFromQueue(3);
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);
  });

  it('reorderQueue adjusts manualQueueCount when moving auto track into manual section', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    usePlayerStore.getState().reorderQueue(3, 1);
    expect(usePlayerStore.getState().manualQueueCount).toBe(2);
  });

  it('reorderQueue adjusts manualQueueCount when moving manual track out of section', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    usePlayerStore.getState().reorderQueue(1, 4);
    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
  });

  it('previous resets manualQueueCount', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 1);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);

    await usePlayerStore.getState().previous();
    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
  });

  it('reorderQueue resets manualQueueCount when dragging current track', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 98 });
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);

    usePlayerStore.getState().reorderQueue(0, 3);
    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
  });

  it('syncQueue resets manualQueueCount', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 0);

    usePlayerStore.getState().addToQueue({ ...mockTrack, trackId: 99 });
    expect(usePlayerStore.getState().manualQueueCount).toBe(1);

    usePlayerStore.getState().syncQueue(makeQueue(5));
    expect(usePlayerStore.getState().manualQueueCount).toBe(0);
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

  it('toggleShuffle should not shuffle station tracks', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 1);

    usePlayerStore.getState().appendStationTracks(mockStationTracks);
    expect(usePlayerStore.getState().stationQueueCount).toBe(2);

    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(true);
    expect(state.cursor).toBe(0);
    expect(state.queue[0]!.trackId).toBe(queue[1]!.trackId);
    expect(state.queue[state.queue.length - 2]!.trackId).toBe(101);
    expect(state.queue[state.queue.length - 1]!.trackId).toBe(102);
    expect(state.queue.length).toBe(7);
  });

  it('toggleShuffle unshuffle should restore original queue with station tracks', async () => {
    const queue = makeQueue(5);
    await usePlayerStore.getState().play(queue, 1);

    usePlayerStore.getState().appendStationTracks(mockStationTracks);

    usePlayerStore.getState().toggleShuffle();
    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(false);
    expect(state.queue.length).toBe(7);
    expect(state.queue[state.queue.length - 2]!.trackId).toBe(101);
    expect(state.queue[state.queue.length - 1]!.trackId).toBe(102);
  });

  it('syncQueue should not shuffle station tracks when shuffle is active', async () => {
    const queue = makeQueue(3);
    await usePlayerStore.getState().play(queue, 1);
    usePlayerStore.getState().toggleShuffle();

    usePlayerStore.getState().appendStationTracks(mockStationTracks);

    const extendedQueue = [...makeQueue(5), ...mockStationTracks];
    usePlayerStore.setState({ stationQueueCount: 2 });
    usePlayerStore.getState().syncQueue(extendedQueue);

    const state = usePlayerStore.getState();
    expect(state.isShuffled).toBe(true);
    expect(state.cursor).toBe(0);
    expect(state.queue[0]?.trackId).toBe(2);
    expect(state.queue[state.queue.length - 2]!.trackId).toBe(101);
    expect(state.queue[state.queue.length - 1]!.trackId).toBe(102);
  });

  describe('crossfade', () => {
    beforeEach(() => {
      resetCrossfadeGeneration();
      useSettingsStore.setState({
        crossfadeEnabled: true,
        crossfadeDuration: 5,
        playerVolume: 1.0,
      });
      usePlayerStore.setState({
        crossfadePending: false,
        crossfadingTrackId: null,
      });
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(false);
      vi.mocked(audioEngine.cancelCrossfade).mockClear();
    });

    it('should have crossfadePending false initially', () => {
      expect(usePlayerStore.getState().crossfadePending).toBe(false);
    });

    it('should have crossfadingTrackId null initially', () => {
      expect(usePlayerStore.getState().crossfadingTrackId).toBeNull();
    });

    it('onEnded should call next() when not crossfading', async () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      const cbs = extractCallbacks();
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(false);
      cbs.onEnded!();

      await vi.waitFor(() => {
        expect(audioEngine.load).toHaveBeenCalled();
      });
    });

    it('onEnded should NOT call next() when crossfading', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      const cbs = extractCallbacks();
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      vi.mocked(audioEngine.load).mockClear();
      cbs.onEnded!();

      expect(audioEngine.load).not.toHaveBeenCalled();
    });

    it('next() should cancel crossfade when cursor not yet advanced', async () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing', crossfadePending: true, crossfadingTrackId: 2 });

      await usePlayerStore.getState().next();
      expect(audioEngine.cancelCrossfade).toHaveBeenCalled();
      expect(usePlayerStore.getState().cursor).toBe(1);
      expect(usePlayerStore.getState().currentTrack?.trackId).toBe(2);
    });

    it('next() should settle crossfade when cursor already advanced', async () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(4);
      usePlayerStore.setState({ queue, cursor: 1, currentTrack: queue[1]!, state: 'playing', crossfadePending: true, crossfadingTrackId: 2 });

      await usePlayerStore.getState().next();
      expect(audioEngine.settleCrossfade).toHaveBeenCalled();
      expect(audioEngine.cancelCrossfade).not.toHaveBeenCalled();
      expect(usePlayerStore.getState().cursor).toBe(2);
      expect(usePlayerStore.getState().currentTrack?.trackId).toBe(3);
    });

    it('previous() should cancel crossfade when cursor not yet advanced', async () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 1, currentTrack: queue[1]!, state: 'playing', crossfadePending: true, crossfadingTrackId: 3 });

      await usePlayerStore.getState().previous();
      expect(audioEngine.cancelCrossfade).toHaveBeenCalled();
      expect(usePlayerStore.getState().cursor).toBe(0);
      expect(usePlayerStore.getState().currentTrack?.trackId).toBe(1);
    });

    it('previous() should settle crossfade when cursor already advanced', async () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(4);
      usePlayerStore.setState({ queue, cursor: 2, currentTrack: queue[2]!, state: 'playing', crossfadePending: true, crossfadingTrackId: 3 });

      await usePlayerStore.getState().previous();
      expect(audioEngine.settleCrossfade).toHaveBeenCalled();
      expect(audioEngine.cancelCrossfade).not.toHaveBeenCalled();
      expect(usePlayerStore.getState().cursor).toBe(1);
      expect(usePlayerStore.getState().currentTrack?.trackId).toBe(2);
    });

    it('skipTo() should cancel crossfade if in progress', async () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      await usePlayerStore.getState().skipTo(2);
      expect(audioEngine.cancelCrossfade).toHaveBeenCalled();
    });

    it('seek() should settle crossfade and keep incoming track', () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      usePlayerStore.getState().seek(5000);
      expect(audioEngine.settleCrossfade).toHaveBeenCalled();
      expect(audioEngine.cancelCrossfade).not.toHaveBeenCalled();

      const state = usePlayerStore.getState();
      expect(state.cursor).toBe(1);
      expect(state.currentTrack?.trackId).toBe(2);
      expect(state.crossfadePending).toBe(false);
    });

    it('seek during crossfade should allow next crossfade to trigger', () => {
      const queue = makeQueue(4);
      usePlayerStore.setState({
        queue,
        cursor: 1,
        currentTrack: queue[1]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);

      usePlayerStore.getState().seek(170000);
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(false);

      const cbs = extractCallbacks();
      usePlayerStore.setState({ durationMs: 180000 });
      cbs.onProgress!(175001, 180000);

      expect(usePlayerStore.getState().crossfadePending).toBe(true);
      expect(usePlayerStore.getState().crossfadingTrackId).toBe(3);
    });

    it('pause() should settle crossfade and keep incoming track', () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 1,
        currentTrack: queue[1]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 3,
      });

      usePlayerStore.getState().pause();
      expect(audioEngine.settleCrossfade).toHaveBeenCalled();
      expect(audioEngine.cancelCrossfade).not.toHaveBeenCalled();

      const state = usePlayerStore.getState();
      expect(state.cursor).toBe(2);
      expect(state.currentTrack?.trackId).toBe(3);
      expect(state.crossfadePending).toBe(false);
    });

    it('should trigger crossfade when remaining time <= crossfadeDuration', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0],
        state: 'playing',
        durationMs: 180000,
        crossfadePending: false,
      });

      const cbs = extractCallbacks();
      cbs.onProgress!(175001, 180000);

      expect(usePlayerStore.getState().crossfadePending).toBe(true);
    });

    it('should NOT trigger crossfade when remaining time > crossfadeDuration', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0],
        state: 'playing',
        durationMs: 180000,
        crossfadePending: false,
      });

      const cbs = extractCallbacks();
      cbs.onProgress!(170000, 180000);
      expect(usePlayerStore.getState().crossfadePending).toBe(false);
    });

    it('should NOT trigger crossfade on last track', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 2,
        currentTrack: queue[2],
        state: 'playing',
        durationMs: 180000,
        crossfadePending: false,
      });

      const cbs = extractCallbacks();
      cbs.onProgress!(175001, 180000);
      expect(usePlayerStore.getState().crossfadePending).toBe(false);
    });

    it('should NOT double-trigger crossfade', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0],
        state: 'playing',
        durationMs: 180000,
        crossfadePending: false,
      });

      const cbs = extractCallbacks();
      cbs.onProgress!(175001, 180000);
      expect(usePlayerStore.getState().crossfadePending).toBe(true);

      vi.mocked(resolveWithCache).mockClear();
      cbs.onProgress!(176000, 180000);
      expect(resolveWithCache).not.toHaveBeenCalled();
    });

    it('should NOT trigger crossfade for track shorter than crossfade duration', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0],
        state: 'playing',
        durationMs: 3000,
        crossfadePending: false,
      });

      const cbs = extractCallbacks();
      cbs.onProgress!(2500, 3000);
      expect(usePlayerStore.getState().crossfadePending).toBe(false);
    });

    it('play() should cancel crossfade if in progress', async () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      await usePlayerStore.getState().play(makeQueue(5), 0);
      expect(audioEngine.cancelCrossfade).toHaveBeenCalled();
      expect(usePlayerStore.getState().crossfadePending).toBe(false);
    });

    it('stop() should cancel crossfade if in progress', () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      usePlayerStore.getState().stop();
      expect(audioEngine.cancelCrossfade).toHaveBeenCalled();
      expect(usePlayerStore.getState().crossfadePending).toBe(false);
    });

    it('next() during crossfade with cursor advanced should go to track after crossfading track', async () => {
      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);
      const queue = makeQueue(4);
      usePlayerStore.setState({
        queue,
        cursor: 1,
        currentTrack: queue[1]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      await usePlayerStore.getState().next();
      const state = usePlayerStore.getState();
      expect(state.crossfadePending).toBe(false);
      expect(state.cursor).toBe(2);
      expect(state.currentTrack?.trackId).toBe(3);
    });

    it('onProgress should advance currentTrack when crossfade begins', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);

      const cbs = extractCallbacks();
      cbs.onProgress!(500, 180000);

      const state = usePlayerStore.getState();
      expect(state.cursor).toBe(1);
      expect(state.currentTrack?.trackId).toBe(2);
    });

    it('onProgress should not re-advance cursor once already advanced', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 1,
        currentTrack: queue[1]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      vi.mocked(audioEngine.isCrossfading).mockReturnValue(true);

      const cbs = extractCallbacks();
      cbs.onProgress!(1000, 180000);

      const state = usePlayerStore.getState();
      expect(state.cursor).toBe(1);
      expect(state.currentTrack?.trackId).toBe(2);
    });

    it('onCrossfadeComplete should advance cursor if not yet advanced', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      const cbs = extractCallbacks();
      cbs.onCrossfadeComplete!();

      const state = usePlayerStore.getState();
      expect(state.cursor).toBe(1);
      expect(state.currentTrack?.trackId).toBe(2);
      expect(state.crossfadePending).toBe(false);
      expect(state.crossfadingTrackId).toBeNull();
      expect(preloadQueueSegments).toHaveBeenCalledWith(queue, 2);
      expect(preloadQueueSegments).toHaveBeenCalledWith(queue, 0);
    });

    it('onCrossfadeComplete should clear flags when cursor already advanced', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 1,
        currentTrack: queue[1]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      const cbs = extractCallbacks();
      cbs.onCrossfadeComplete!();

      const state = usePlayerStore.getState();
      expect(state.cursor).toBe(1);
      expect(state.crossfadePending).toBe(false);
      expect(state.crossfadingTrackId).toBeNull();
      expect(preloadQueueSegments).toHaveBeenCalledWith(queue, 2);
      expect(preloadQueueSegments).toHaveBeenCalledWith(queue, 0);
    });

    it('onCrossfadeComplete should advance to correct track after queue reorder', () => {
      const queue = makeQueue(4);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 2,
      });

      // Reorder: move track 2 (index 1) to index 3
      usePlayerStore.getState().reorderQueue(1, 3);

      const cbs = extractCallbacks();
      cbs.onCrossfadeComplete!();

      const state = usePlayerStore.getState();
      // Track 2 is now at index 3 after reorder — cursor should follow by trackId
      expect(state.currentTrack?.trackId).toBe(2);
      expect(state.cursor).toBe(3);
      expect(state.crossfadePending).toBe(false);
      expect(state.crossfadingTrackId).toBeNull();
    });

    it('onCrossfadeComplete should reset state if next track does not match', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        crossfadePending: true,
        crossfadingTrackId: 99,
      });

      const cbs = extractCallbacks();
      cbs.onCrossfadeComplete!();

      const state = usePlayerStore.getState();
      expect(state.cursor).toBe(0);
      expect(state.crossfadePending).toBe(false);
      expect(state.crossfadingTrackId).toBeNull();
    });
  });
});
