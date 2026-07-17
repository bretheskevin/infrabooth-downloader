import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'player.nextUp') return 'Next up';
      if (key === 'player.stationSection') return 'Station';
      if (key === 'player.queueSection') return 'Queue';
      return key;
    },
  }),
}));

vi.mock('@dnd-kit/core', () => ({
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn((_sensor: unknown, opts: unknown) => ({ opts })),
  useSensors: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock('@/hooks/useVirtualizedList', () => ({
  useVirtualizedList: vi.fn(() => ({
    parentRef: { current: null },
    virtualItems: [],
    totalSize: 0,
  })),
}));

interface MockItem {
  uid: string;
  trackId: number;
  title: string;
  artist: string;
  artworkUrl: string | null;
  durationMs: number;
}

const makeItem = (trackId: number, title: string, artist: string, durationMs: number): MockItem => ({
  uid: `u${trackId}`,
  trackId,
  title,
  artist,
  artworkUrl: null,
  durationMs,
});

const mockState = {
  queue: [] as MockItem[],
  cursor: -1,
  state: 'playing' as string,
  manualQueueCount: 0,
  stationQueueCount: 0,
};

const mockActions = {
  skipTo: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  removeFromQueue: vi.fn(),
  reorderQueue: vi.fn(),
};

vi.mock('../store', () => ({
  usePlayerStore: Object.assign((selector: (s: typeof mockState) => unknown) => selector(mockState), {
    getState: () => mockActions,
  }),
}));

import { useQueueInteraction } from '../hooks/useQueueInteraction';

describe('useQueueInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.queue = [];
    mockState.cursor = -1;
    mockState.state = 'playing';
    mockState.manualQueueCount = 0;
    mockState.stationQueueCount = 0;
  });

  it('returns queue and cursor from store', () => {
    mockState.queue = [makeItem(1, 'A', 'X', 1000)];
    mockState.cursor = 0;

    const { result } = renderHook(() => useQueueInteraction());
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.cursor).toBe(0);
  });

  it('returns playerState from store', () => {
    mockState.state = 'paused';
    const { result } = renderHook(() => useQueueInteraction());
    expect(result.current.playerState).toBe('paused');
  });

  it('computes itemIds from queue uids', () => {
    mockState.queue = [makeItem(10, 'A', 'X', 1000), makeItem(20, 'B', 'Y', 2000)];

    const { result } = renderHook(() => useQueueInteraction());
    expect(result.current.itemIds).toEqual(['u10', 'u20']);
  });

  it('returns sensors array', () => {
    const { result } = renderHook(() => useQueueInteraction());
    expect(result.current.sensors).toBeDefined();
  });

  it('returns virtualization props', () => {
    const { result } = renderHook(() => useQueueInteraction());
    expect(result.current.parentRef).toBeDefined();
    expect(result.current.virtualItems).toBeDefined();
    expect(result.current.totalSize).toBeDefined();
  });

  describe('getSectionHeader', () => {
    it('returns nextUp for manual queue start', () => {
      mockState.queue = [makeItem(1, 'Current', 'X', 1000), makeItem(2, 'Manual', 'Y', 2000)];
      mockState.cursor = 0;
      mockState.manualQueueCount = 1;

      const { result } = renderHook(() => useQueueInteraction());
      expect(result.current.getSectionHeader(1)).toBe('Next up');
    });

    it('returns station section header at station start', () => {
      mockState.queue = [makeItem(1, 'A', 'X', 1000), makeItem(2, 'Station', 'Y', 2000)];
      mockState.cursor = -1;
      mockState.stationQueueCount = 1;

      const { result } = renderHook(() => useQueueInteraction());
      expect(result.current.getSectionHeader(1)).toBe('Station');
    });

    it('returns undefined for non-header positions', () => {
      mockState.queue = [makeItem(1, 'A', 'X', 1000)];
      mockState.cursor = 0;

      const { result } = renderHook(() => useQueueInteraction());
      expect(result.current.getSectionHeader(0)).toBeUndefined();
    });
  });

  describe('drag handlers', () => {
    it('handleDragStart sets activeId', () => {
      const { result } = renderHook(() => useQueueInteraction());
      expect(result.current.activeId).toBeNull();

      act(() => {
        result.current.handleDragStart({
          active: { id: 'u42' },
        } as never);
      });

      expect(result.current.activeId).toBe('u42');
    });

    it('handleDragEnd resets activeId and calls reorderQueue', () => {
      mockState.queue = [makeItem(1, 'A', 'X', 1000), makeItem(2, 'B', 'Y', 2000)];

      const { result } = renderHook(() => useQueueInteraction());

      act(() => {
        result.current.handleDragStart({
          active: { id: 'u1' },
        } as never);
      });

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'u1' },
          over: { id: 'u2' },
        } as never);
      });

      expect(result.current.activeId).toBeNull();
      expect(mockActions.reorderQueue).toHaveBeenCalledWith(0, 1);
    });

    it('handleDragCancel resets activeId', () => {
      const { result } = renderHook(() => useQueueInteraction());

      act(() => {
        result.current.handleDragStart({
          active: { id: 'u42' },
        } as never);
      });

      act(() => {
        result.current.handleDragCancel();
      });

      expect(result.current.activeId).toBeNull();
    });
  });

  describe('item callbacks', () => {
    it('handlePlay calls skipTo', () => {
      const { result } = renderHook(() => useQueueInteraction());
      result.current.handlePlay(3);
      expect(mockActions.skipTo).toHaveBeenCalledWith(3);
    });

    it('handlePause calls pause', () => {
      const { result } = renderHook(() => useQueueInteraction());
      result.current.handlePause();
      expect(mockActions.pause).toHaveBeenCalled();
    });

    it('handleResume calls resume', () => {
      const { result } = renderHook(() => useQueueInteraction());
      result.current.handleResume();
      expect(mockActions.resume).toHaveBeenCalled();
    });

    it('handleRemove calls removeFromQueue', () => {
      const { result } = renderHook(() => useQueueInteraction());
      result.current.handleRemove(5);
      expect(mockActions.removeFromQueue).toHaveBeenCalledWith(5);
    });
  });

  describe('active item tracking', () => {
    it('returns null activeItem when no drag', () => {
      const { result } = renderHook(() => useQueueInteraction());
      expect(result.current.activeItem).toBeNull();
      expect(result.current.activeIndex).toBe(-1);
    });

    it('returns activeItem and activeIndex during drag', () => {
      mockState.queue = [makeItem(10, 'Track', 'Artist', 1000)];

      const { result } = renderHook(() => useQueueInteraction());

      act(() => {
        result.current.handleDragStart({
          active: { id: 'u10' },
        } as never);
      });

      expect(result.current.activeItem).toEqual(mockState.queue[0]);
      expect(result.current.activeIndex).toBe(0);
    });
  });
});
