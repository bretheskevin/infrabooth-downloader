import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../url-cache', () => ({
  getCachedUrl: vi.fn().mockReturnValue(null),
  setCachedUrl: vi.fn(),
  invalidateCachedUrl: vi.fn(),
  resolveWithCache: vi.fn().mockResolvedValue('https://example.com/stream.m3u8'),
  preloadQueueSegments: vi.fn(),
  purgeStaleCache: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  api: {
    fetchRelatedTracks: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { usePlayerStore } from '../store';
import { audioEngine } from '../audio-engine';
import { api } from '@/lib/tauri';
import { toast } from 'sonner';
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

const makeQueue = (count: number, startId = 1): PlaybackItem[] =>
  Array.from({ length: count }, (_, i) => ({
    ...mockTrack,
    trackId: startId + i,
    title: `Track ${startId + i}`,
  }));

const makeRelatedTracks = (count: number, startId = 100) =>
  Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    title: `Related Track ${startId + i}`,
    user: { id: 0, username: 'Related Artist', avatar_url: null },
    artwork_url: null,
    duration: 200000,
    permalink_url: `https://soundcloud.com/related/track-${startId + i}`,
    waveform_url: null,
    downloadable: false,
    download_url: null,
  }));

function extractCallbacks(): Partial<AudioEngineCallbacks> {
  usePlayerStore.getState()._initAudioEngine();
  const calls = (audioEngine.setCallbacks as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1]![0] as Partial<AudioEngineCallbacks>;
}

describe('autoplay station', () => {
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
      crossfadePending: false,
      crossfadingTrackId: null,
      autoplayInFlight: false,
    });
    vi.clearAllMocks();
  });

  describe('appendStationTracks', () => {
    it('should append tracks to the end of the queue', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      const stationTracks = makeQueue(5, 10);
      usePlayerStore.getState().appendStationTracks(stationTracks);

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(8);
      expect(state.queue[3]!.trackId).toBe(10);
      expect(state.queue[7]!.trackId).toBe(14);
    });

    it('should increment stationQueueCount', () => {
      const queue = makeQueue(2);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      usePlayerStore.getState().appendStationTracks(makeQueue(5, 10));
      expect(usePlayerStore.getState().stationQueueCount).toBe(5);

      usePlayerStore.getState().appendStationTracks(makeQueue(3, 20));
      expect(usePlayerStore.getState().stationQueueCount).toBe(8);
    });

    it('should filter out duplicate tracks already in queue', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      const stationTracks = [...makeQueue(2), ...makeQueue(2, 10)];
      usePlayerStore.getState().appendStationTracks(stationTracks);

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(5);
      expect(state.stationQueueCount).toBe(2);
      expect(state.queue[3]!.trackId).toBe(10);
      expect(state.queue[4]!.trackId).toBe(11);
    });

    it('should not modify state when all tracks are duplicates', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing', stationQueueCount: 0 });

      usePlayerStore.getState().appendStationTracks(makeQueue(2));

      const state = usePlayerStore.getState();
      expect(state.queue).toHaveLength(3);
      expect(state.stationQueueCount).toBe(0);
    });
  });

  describe('next() autoplay behavior', () => {
    it('should fetch and append related tracks when queue is exhausted', async () => {
      const queue = makeQueue(1);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      vi.mocked(api.fetchRelatedTracks).mockResolvedValue(makeRelatedTracks(10));

      const cbs = extractCallbacks();
      cbs.onEnded!();

      await vi.waitFor(() => {
        const state = usePlayerStore.getState();
        expect(state.queue).toHaveLength(11);
        expect(state.stationQueueCount).toBe(10);
      });

      expect(api.fetchRelatedTracks).toHaveBeenCalledWith(1, 10);
      expect(audioEngine.load).toHaveBeenCalled();
    });

    it('should stop if fetch returns empty collection', async () => {
      const queue = makeQueue(1);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      vi.mocked(api.fetchRelatedTracks).mockResolvedValue([]);

      const cbs = extractCallbacks();
      cbs.onEnded!();

      await vi.waitFor(() => {
        expect(usePlayerStore.getState().state).toBe('stopped');
      });

      expect(audioEngine.stop).toHaveBeenCalled();
    });

    it('should retry once on failure then stop with toast', async () => {
      const queue = makeQueue(1);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      vi.mocked(api.fetchRelatedTracks)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error again'));

      const cbs = extractCallbacks();
      cbs.onEnded!();

      await vi.waitFor(() => {
        expect(usePlayerStore.getState().state).toBe('stopped');
      });

      expect(api.fetchRelatedTracks).toHaveBeenCalledTimes(2);
      expect(toast.error).toHaveBeenCalled();
    });

    it('should succeed on retry after first failure', async () => {
      const queue = makeQueue(1);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      vi.mocked(api.fetchRelatedTracks).mockRejectedValueOnce(new Error('Transient error')).mockResolvedValueOnce(makeRelatedTracks(10));

      const cbs = extractCallbacks();
      cbs.onEnded!();

      await vi.waitFor(() => {
        const state = usePlayerStore.getState();
        expect(state.queue).toHaveLength(11);
        expect(state.stationQueueCount).toBe(10);
      });

      expect(api.fetchRelatedTracks).toHaveBeenCalledTimes(2);
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('stop() resets stationQueueCount', () => {
    it('should reset stationQueueCount to 0', () => {
      const queue = makeQueue(3);
      usePlayerStore.setState({
        queue,
        cursor: 0,
        currentTrack: queue[0]!,
        state: 'playing',
        stationQueueCount: 5,
      });

      usePlayerStore.getState().stop();

      expect(usePlayerStore.getState().stationQueueCount).toBe(0);
    });
  });

  describe('removeFromQueue decrements stationQueueCount', () => {
    it('should decrement stationQueueCount when removing a station track', () => {
      const queue = makeQueue(2);
      const stationTracks = makeQueue(3, 10);
      const fullQueue = [...queue, ...stationTracks];
      usePlayerStore.setState({
        queue: fullQueue,
        cursor: 0,
        currentTrack: fullQueue[0]!,
        state: 'playing',
        stationQueueCount: 3,
      });

      // Remove last track (a station track, index 4)
      usePlayerStore.getState().removeFromQueue(4);

      expect(usePlayerStore.getState().stationQueueCount).toBe(2);
    });

    it('should NOT decrement stationQueueCount when removing a non-station track', () => {
      const queue = makeQueue(3);
      const stationTracks = makeQueue(2, 10);
      const fullQueue = [...queue, ...stationTracks];
      usePlayerStore.setState({
        queue: fullQueue,
        cursor: 0,
        currentTrack: fullQueue[0]!,
        state: 'playing',
        stationQueueCount: 2,
      });

      // Remove track at index 1 (regular queue track, not station)
      usePlayerStore.getState().removeFromQueue(1);

      expect(usePlayerStore.getState().stationQueueCount).toBe(2);
    });
  });

  describe('maybePrefetchStation', () => {
    it('should prefetch when remaining tracks drop to threshold', async () => {
      const queue = makeQueue(2);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      vi.mocked(api.fetchRelatedTracks).mockResolvedValue(makeRelatedTracks(10));

      await usePlayerStore.getState().next();

      await vi.waitFor(() => {
        expect(api.fetchRelatedTracks).toHaveBeenCalledWith(queue[0]!.trackId, 10);
      });
    });

    it('should not prefetch when many tracks remain', async () => {
      const queue = makeQueue(10);
      usePlayerStore.setState({ queue, cursor: 0, currentTrack: queue[0]!, state: 'playing' });

      await usePlayerStore.getState().next();

      expect(api.fetchRelatedTracks).not.toHaveBeenCalled();
    });
  });

  describe('prefetchStationOnInit (play triggers immediate fetch)', () => {
    it('should fetch related tracks immediately when play() initializes the queue', async () => {
      const queue = makeQueue(5);
      vi.mocked(api.fetchRelatedTracks).mockResolvedValue(makeRelatedTracks(10));

      await usePlayerStore.getState().play(queue, 0);

      await vi.waitFor(() => {
        expect(api.fetchRelatedTracks).toHaveBeenCalledWith(queue[4]!.trackId, 10);
      });

      await vi.waitFor(() => {
        const state = usePlayerStore.getState();
        expect(state.queue).toHaveLength(15);
        expect(state.stationQueueCount).toBe(10);
      });
    });

    it('should use last track in queue as seed for related tracks', async () => {
      const queue = makeQueue(3);
      vi.mocked(api.fetchRelatedTracks).mockResolvedValue(makeRelatedTracks(5));

      await usePlayerStore.getState().play(queue, 0);

      await vi.waitFor(() => {
        expect(api.fetchRelatedTracks).toHaveBeenCalledWith(3, 10);
      });
    });

    it('should not block playback if station fetch fails', async () => {
      const queue = makeQueue(3);
      vi.mocked(api.fetchRelatedTracks).mockRejectedValue(new Error('Network error'));

      await usePlayerStore.getState().play(queue, 0);

      expect(usePlayerStore.getState().state).not.toBe('stopped');
      expect(audioEngine.load).toHaveBeenCalled();
    });
  });
});
