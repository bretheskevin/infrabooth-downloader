import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQueueStore } from '@/features/queue/store';
import type { Track } from '@/features/queue/types/track';

vi.mock('@/lib/tauri', () => ({
  api: {
    appendDownloadHistoryEntry: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

import { useRecordDownloadHistory } from '../hooks/useRecordDownloadHistory';
import { api } from '@/lib/tauri';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    title: 'Test Track',
    artist: 'Test Artist',
    artworkUrl: null,
    durationMs: 180000,
    status: 'complete',
    ...overrides,
  };
}

describe('useRecordDownloadHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueueStore.getState().clearQueue();
  });

  it('records a single-track entry on completion', async () => {
    renderHook(() => useRecordDownloadHistory());

    act(() => {
      useQueueStore.setState({
        tracks: [makeTrack()],
        totalTracks: 1,
        isComplete: true,
        isCancelled: false,
        completedCount: 1,
        failedCount: 0,
        cancelledCount: 0,
        outputDir: '/downloads',
        batchTitle: null,
      });
    });

    await vi.waitFor(() => {
      expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(1);
    });

    const entry = vi.mocked(api.appendDownloadHistoryEntry).mock.calls[0]![0]!;
    expect(entry.kind).toBe('Track');
    expect(entry.title).toBe('Test Track');
    expect(entry.okCount).toBe(1);
    expect(entry.failedCount).toBe(0);
    expect(entry.cancelled).toBe(false);
    expect(entry.destDir).toBe('/downloads');
    expect(entry.tracks).toHaveLength(1);
  });

  it('records a playlist entry when batchTitle is set', async () => {
    renderHook(() => useRecordDownloadHistory());

    act(() => {
      useQueueStore.setState({
        tracks: [
          makeTrack({ id: 't1', title: 'Track 1' }),
          makeTrack({ id: 't2', title: 'Track 2' }),
        ],
        totalTracks: 2,
        isComplete: true,
        isCancelled: false,
        completedCount: 2,
        failedCount: 0,
        cancelledCount: 0,
        outputDir: '/downloads',
        batchTitle: 'My Playlist',
      });
    });

    await vi.waitFor(() => {
      expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(1);
    });

    const entry = vi.mocked(api.appendDownloadHistoryEntry).mock.calls[0]![0]!;
    expect(entry.kind).toBe('Playlist');
    expect(entry.title).toBe('My Playlist');
    expect(entry.tracks).toHaveLength(2);
  });

  it('records cancelled batches', async () => {
    renderHook(() => useRecordDownloadHistory());

    act(() => {
      useQueueStore.setState({
        tracks: [makeTrack({ status: 'complete' }), makeTrack({ id: 't2', status: 'skipped' })],
        totalTracks: 2,
        isComplete: true,
        isCancelled: true,
        completedCount: 1,
        failedCount: 0,
        cancelledCount: 1,
        outputDir: '/downloads',
        batchTitle: 'My Playlist',
      });
    });

    await vi.waitFor(() => {
      expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(1);
    });

    const entry = vi.mocked(api.appendDownloadHistoryEntry).mock.calls[0]![0]!;
    expect(entry.cancelled).toBe(true);
  });

  it('categorizes DRM failures with reason', async () => {
    renderHook(() => useRecordDownloadHistory());

    act(() => {
      useQueueStore.setState({
        tracks: [
          makeTrack({
            status: 'failed',
            error: { code: 'DOWNLOAD_FAILED', message: 'DRM protected' },
          }),
        ],
        totalTracks: 1,
        isComplete: true,
        isCancelled: false,
        completedCount: 0,
        failedCount: 1,
        cancelledCount: 0,
        outputDir: '/downloads',
        batchTitle: null,
      });
    });

    await vi.waitFor(() => {
      expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(1);
    });

    const entry = vi.mocked(api.appendDownloadHistoryEntry).mock.calls[0]![0]!;
    expect(entry.tracks[0]!.reason).toBe('drm_protected');
  });

  it('does not double-record the same completion', async () => {
    const { rerender } = renderHook(() => useRecordDownloadHistory());

    act(() => {
      useQueueStore.setState({
        tracks: [makeTrack()],
        totalTracks: 1,
        isComplete: true,
        isCancelled: false,
        completedCount: 1,
        failedCount: 0,
        cancelledCount: 0,
        outputDir: '/downloads',
        batchTitle: null,
      });
    });

    await vi.waitFor(() => {
      expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(1);
    });

    rerender();

    expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(1);
  });

  it('records a new batch after queue reset even with identical stats', async () => {
    renderHook(() => useRecordDownloadHistory());

    act(() => {
      useQueueStore.setState({
        tracks: [makeTrack()],
        totalTracks: 1,
        isComplete: true,
        isCancelled: false,
        completedCount: 1,
        failedCount: 0,
        cancelledCount: 0,
        outputDir: '/downloads',
        batchTitle: null,
      });
    });

    await vi.waitFor(() => {
      expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(1);
    });

    act(() => {
      useQueueStore.setState({ isComplete: false });
    });

    act(() => {
      useQueueStore.setState({
        tracks: [makeTrack({ id: 'track-2', title: 'Other Track' })],
        totalTracks: 1,
        isComplete: true,
        isCancelled: false,
        completedCount: 1,
        failedCount: 0,
        cancelledCount: 0,
        outputDir: '/downloads',
        batchTitle: null,
      });
    });

    await vi.waitFor(() => {
      expect(api.appendDownloadHistoryEntry).toHaveBeenCalledTimes(2);
    });
  });
});
