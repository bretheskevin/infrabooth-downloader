import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the tauri API
vi.mock('@/lib/tauri', () => ({
  api: {
    playerPlayAt: vi.fn().mockResolvedValue(undefined),
    playerPause: vi.fn().mockResolvedValue(undefined),
    playerResume: vi.fn().mockResolvedValue(undefined),
    playerSeek: vi.fn().mockResolvedValue(undefined),
    playerSetVolume: vi.fn().mockResolvedValue(undefined),
    playerNext: vi.fn().mockResolvedValue(undefined),
    playerPrevious: vi.fn().mockResolvedValue(undefined),
    playerStop: vi.fn().mockResolvedValue(undefined),
    playerReorderQueue: vi.fn().mockResolvedValue(undefined),
    playerRemoveFromQueue: vi.fn().mockResolvedValue(undefined),
  },
}));

import { usePlayerStore } from '../store';
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

  it('play() should optimistically update state and call API', async () => {
    const queue = [mockTrack];
    await usePlayerStore.getState().play(queue, 0);
    const state = usePlayerStore.getState();
    expect(state.queue).toEqual(queue);
    expect(state.cursor).toBe(0);
    expect(state.currentTrack).toEqual(mockTrack);
    expect(state.state).toBe('loading');
    expect(api.playerPlayAt).toHaveBeenCalledWith(
      [{ track_id: 1, track_url: mockTrack.trackUrl, title: mockTrack.title, artist: mockTrack.artist, artwork_url: null, duration_ms: 180000 }],
      0,
    );
  });

  it('pause() should call API', async () => {
    await usePlayerStore.getState().pause();
    expect(api.playerPause).toHaveBeenCalled();
  });

  it('setVolume() should optimistically update and call API', async () => {
    await usePlayerStore.getState().setVolume(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);
    expect(api.playerSetVolume).toHaveBeenCalledWith(0.5);
  });

  it('setVolume() should rollback on API failure', async () => {
    vi.mocked(api.playerSetVolume).mockRejectedValueOnce(new Error('fail'));
    usePlayerStore.setState({ volume: 0.8 });
    await expect(usePlayerStore.getState().setVolume(0.3)).rejects.toThrow('fail');
    expect(usePlayerStore.getState().volume).toBe(0.8);
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

  it('reorderQueue should optimistically update queue and cursor', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 0 });
    await usePlayerStore.getState().reorderQueue(0, 2);

    const state = usePlayerStore.getState();
    expect(state.queue[0]!.trackId).toBe(2);
    expect(state.queue[1]!.trackId).toBe(3);
    expect(state.queue[2]!.trackId).toBe(1);
    expect(state.cursor).toBe(2);
    expect(state.currentTrack!.trackId).toBe(1);
    expect(api.playerReorderQueue).toHaveBeenCalledWith(0, 2);
  });

  it('reorderQueue should rollback on API failure', async () => {
    vi.mocked(api.playerReorderQueue).mockRejectedValueOnce(new Error('fail'));
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 0 });
    await expect(usePlayerStore.getState().reorderQueue(0, 2)).rejects.toThrow('fail');
    expect(usePlayerStore.getState().queue[0]!.trackId).toBe(1);
    expect(usePlayerStore.getState().cursor).toBe(0);
  });

  it('removeFromQueue should optimistically update and call API', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 2 });
    await usePlayerStore.getState().removeFromQueue(0);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(2);
    expect(state.cursor).toBe(1);
    expect(state.currentTrack!.trackId).toBe(3);
    expect(api.playerRemoveFromQueue).toHaveBeenCalledWith(0);
  });

  it('removeFromQueue should handle removing current track', async () => {
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 1 });
    await usePlayerStore.getState().removeFromQueue(1);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(2);
    expect(state.cursor).toBe(1);
    expect(state.currentTrack!.trackId).toBe(3);
  });

  it('removeFromQueue should stop when queue becomes empty', async () => {
    const queue = [mockTrack];
    usePlayerStore.setState({ queue, cursor: 0, state: 'playing' });
    await usePlayerStore.getState().removeFromQueue(0);

    const state = usePlayerStore.getState();
    expect(state.queue).toEqual([]);
    expect(state.cursor).toBe(0);
    expect(state.currentTrack).toBeNull();
    expect(state.state).toBe('stopped');
    expect(state.positionMs).toBe(0);
    expect(state.isQueueOpen).toBe(false);
    expect(api.playerRemoveFromQueue).toHaveBeenCalledWith(0);
  });

  it('removeFromQueue should rollback on API failure', async () => {
    vi.mocked(api.playerRemoveFromQueue).mockRejectedValueOnce(new Error('fail'));
    const queue = makeQueue();
    usePlayerStore.setState({ queue, cursor: 1 });
    await expect(usePlayerStore.getState().removeFromQueue(0)).rejects.toThrow('fail');
    expect(usePlayerStore.getState().queue).toHaveLength(3);
    expect(usePlayerStore.getState().cursor).toBe(1);
  });

  describe('event handlers', () => {
    it('_onStateChanged should update state', () => {
      usePlayerStore.getState()._onStateChanged('playing', 1);
      expect(usePlayerStore.getState().state).toBe('playing');
    });

    it('_onStateChanged stopped should reset all state', () => {
      usePlayerStore.setState({ state: 'playing', queue: makeQueue(), cursor: 1, positionMs: 5000, isQueueOpen: true });
      usePlayerStore.getState()._onStateChanged('stopped', null);
      const state = usePlayerStore.getState();
      expect(state.state).toBe('stopped');
      expect(state.currentTrack).toBeNull();
      expect(state.queue).toEqual([]);
      expect(state.cursor).toBe(0);
      expect(state.positionMs).toBe(0);
      expect(state.isQueueOpen).toBe(false);
    });

    it('_onProgress should update position and duration', () => {
      usePlayerStore.getState()._onProgress(5000, 180000);
      expect(usePlayerStore.getState().positionMs).toBe(5000);
      expect(usePlayerStore.getState().durationMs).toBe(180000);
    });

    it('_onTrackChanged should update cursor and currentTrack', () => {
      const queue = makeQueue();
      usePlayerStore.setState({ queue });
      usePlayerStore.getState()._onTrackChanged(2, 1, 3);
      expect(usePlayerStore.getState().cursor).toBe(1);
      expect(usePlayerStore.getState().currentTrack!.trackId).toBe(2);
      expect(usePlayerStore.getState().positionMs).toBe(0);
    });

    it('_onError should log error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      usePlayerStore.getState()._onError(1, 'decode error');
      expect(spy).toHaveBeenCalledWith('[player] Error for track 1: decode error');
      spy.mockRestore();
    });
  });
});
