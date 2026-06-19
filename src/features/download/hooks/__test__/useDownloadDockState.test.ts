import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownloadDockState } from '../useDownloadDockState';

const mockQueueState = {
  isProcessing: false,
  isInitializing: false,
  isComplete: false,
  isCancelled: false,
  isCancelling: false,
  tracks: [] as Array<{ id: string; status: string }>,
  totalTracks: 0,
  completedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
};

vi.mock('@/features/queue', async () => {
  const actual = await vi.importActual('@/features/queue');
  const storeFn = vi.fn((selector: (s: typeof mockQueueState) => unknown) => selector(mockQueueState));
  return {
    ...actual,
    useQueueStore: Object.assign(storeFn, { getState: () => mockQueueState }),
  };
});

function resetMocks() {
  mockQueueState.isProcessing = false;
  mockQueueState.isInitializing = false;
  mockQueueState.isComplete = false;
  mockQueueState.isCancelled = false;
  mockQueueState.isCancelling = false;
  mockQueueState.tracks = [];
  mockQueueState.totalTracks = 0;
  mockQueueState.completedCount = 0;
  mockQueueState.failedCount = 0;
  mockQueueState.cancelledCount = 0;
}

describe('useDownloadDockState', () => {
  beforeEach(resetMocks);

  it('returns idle when no tracks and not processing', () => {
    const { result } = renderHook(() => useDownloadDockState());
    expect(result.current.isVisible).toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('returns processing when isProcessing is true', () => {
    mockQueueState.isProcessing = true;
    mockQueueState.totalTracks = 5;
    const { result } = renderHook(() => useDownloadDockState());
    expect(result.current.isVisible).toBe(true);
    expect(result.current.status).toBe('processing');
    expect(result.current.totalTracks).toBe(5);
  });

  it('returns initializing when isInitializing is true', () => {
    mockQueueState.isInitializing = true;
    const { result } = renderHook(() => useDownloadDockState());
    expect(result.current.isVisible).toBe(true);
    expect(result.current.status).toBe('initializing');
  });

  it('returns complete when isComplete is true and not dismissed', () => {
    mockQueueState.isComplete = true;
    mockQueueState.completedCount = 5;
    mockQueueState.totalTracks = 5;
    const { result } = renderHook(() => useDownloadDockState());
    expect(result.current.isVisible).toBe(true);
    expect(result.current.status).toBe('complete');
  });

  it('hides dock after dismiss', () => {
    mockQueueState.isComplete = true;
    mockQueueState.completedCount = 5;
    mockQueueState.totalTracks = 5;
    const { result } = renderHook(() => useDownloadDockState());
    expect(result.current.isVisible).toBe(true);
    act(() => {
      result.current.dismissDock();
    });
    expect(result.current.isVisible).toBe(false);
  });

  it('resets dismissed state when a new download starts', () => {
    mockQueueState.isComplete = true;
    const { result, rerender } = renderHook(() => useDownloadDockState());
    act(() => {
      result.current.dismissDock();
    });
    expect(result.current.isVisible).toBe(false);
    mockQueueState.isComplete = false;
    mockQueueState.isProcessing = true;
    mockQueueState.totalTracks = 3;
    rerender();
    expect(result.current.isVisible).toBe(true);
    expect(result.current.status).toBe('processing');
  });

  it('returns cancelled status when isComplete and isCancelled are both true', () => {
    mockQueueState.isComplete = true;
    mockQueueState.isCancelled = true;
    mockQueueState.cancelledCount = 3;
    mockQueueState.completedCount = 2;
    mockQueueState.totalTracks = 5;
    const { result } = renderHook(() => useDownloadDockState());
    expect(result.current.status).toBe('cancelled');
    expect(result.current.isVisible).toBe(true);
  });

  it('computes percentage from tracks', () => {
    mockQueueState.isProcessing = true;
    mockQueueState.totalTracks = 4;
    mockQueueState.tracks = [
      { id: '1', status: 'complete' },
      { id: '2', status: 'complete' },
      { id: '3', status: 'downloading' },
      { id: '4', status: 'pending' },
    ] as typeof mockQueueState.tracks;
    const { result } = renderHook(() => useDownloadDockState());
    expect(result.current.percentage).toBe(50);
    expect(result.current.doneCount).toBe(2);
  });
});
