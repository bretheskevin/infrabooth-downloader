import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrackListState } from '../hooks/useTrackListState';
import type { TrackInfo } from '@/bindings';

const mockPlayTrack = vi.fn();
const mockSyncQueue = vi.fn();
let mockCurrentTrackId: number | undefined = undefined;
const mockDownloadTrack = vi.fn();
const mockHandleDownloadSelected = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockToggleExcluded = vi.fn();
const mockExcludeTracks = vi.fn();
let mockExcludedIds = new Set<number>();
const mockClearSelection = vi.fn();
let mockSelectedTracks: TrackInfo[] = [];
let mockDownloadedIds = new Set<number>();
let capturedDownloadableTracks: TrackInfo[] = [];
let mockRekordboxStatus: { found: boolean } | undefined = { found: true };

vi.mock('@/features/settings/hooks/useIsDownloadEnabled', () => ({
  useIsDownloadEnabled: () => true,
}));

vi.mock('@/hooks/useSearchFilter', () => ({
  useSearchFilter: (tracks: TrackInfo[]) => ({
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    filteredTracks: tracks,
  }),
}));

vi.mock('@/hooks/useTrackDownloadState', () => ({
  useTrackDownloadState: () => ({
    downloadTrack: mockDownloadTrack,
    downloadedIds: mockDownloadedIds,
    downloadedCount: 0,
  }),
}));

vi.mock('@/features/rekordbox-export/hooks/useRekordboxDetection', () => ({
  useRekordboxDetection: () => ({ data: mockRekordboxStatus }),
}));

vi.mock('@/hooks/useTrackSelection', () => ({
  useTrackSelection: () => ({
    selectedIds: new Set<number>(),
    toggleTrack: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: mockClearSelection,
    selectedCount: mockSelectedTracks.length,
    isAllSelected: false,
    selectedTracks: mockSelectedTracks,
    selectableCount: mockSelectedTracks.length,
  }),
}));

vi.mock('@/features/player/hooks/usePlayContext', () => ({
  usePlayContext: () => ({ playTrack: mockPlayTrack, syncQueue: mockSyncQueue }),
}));

vi.mock('@/features/player/store', () => ({
  usePlayerStore: (selector: (state: { currentTrack: { trackId: number } | null }) => unknown) =>
    selector ? selector({ currentTrack: mockCurrentTrackId != null ? { trackId: mockCurrentTrackId } : null }) : undefined,
}));

vi.mock('@/hooks/useDownloadSelected', () => ({
  useDownloadSelected: (tracks: TrackInfo[]) => {
    capturedDownloadableTracks = tracks;
    return mockHandleDownloadSelected;
  },
}));

vi.mock('@/hooks/useFolderPath', () => ({
  useFolderPath: () => ({
    effectivePath: '/default/path',
    folderName: 'path',
    isCustomFolder: false,
    selectFolder: vi.fn(),
    resetLocalPath: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOpenDownloadFolder', () => ({
  useOpenDownloadFolder: () => vi.fn(),
}));

vi.mock('@/features/rekordbox-export/store', () => ({
  useExcludedTrackIds: () => mockExcludedIds,
  useRekordboxExclusionStore: {
    getState: () => ({
      toggleExcluded: mockToggleExcluded,
      excludeTracks: mockExcludeTracks,
    }),
  },
}));

const createTrack = (id: number) =>
  ({
    id,
    title: `Track ${id}`,
    user: { id: 0, username: 'Artist', avatar_url: null },
    duration: 180000,
    artwork_url: null,
    permalink_url: `https://soundcloud.com/artist/track-${id}`,
  }) as TrackInfo;

describe('useTrackListState', () => {
  const baseConfig = {
    tracks: [createTrack(1), createTrack(2), createTrack(3)] as TrackInfo[],
    isLoading: false,
    title: 'Test Playlist',
    download: { path: '/downloads', onDownloadTracks: vi.fn() },
    searchThreshold: 5,
  };

  beforeEach(() => {
    mockToggleExcluded.mockClear();
    mockExcludeTracks.mockClear();
    mockExcludedIds = new Set<number>();
    mockClearSelection.mockClear();
    mockSelectedTracks = [];
    mockDownloadedIds = new Set<number>();
    capturedDownloadableTracks = [];
    mockRekordboxStatus = { found: true };
  });

  it('returns displayTracks from search filter', () => {
    const { result } = renderHook(() => useTrackListState(baseConfig));
    expect(result.current.displayTracks).toHaveLength(3);
  });

  it('hides search when tracks below threshold', () => {
    const { result } = renderHook(() => useTrackListState(baseConfig));
    expect(result.current.showSearch).toBe(false);
  });

  it('shows search when tracks at or above threshold', () => {
    const tracks = Array.from({ length: 5 }, (_, i) => createTrack(i));
    const { result } = renderHook(() => useTrackListState({ ...baseConfig, tracks }));
    expect(result.current.showSearch).toBe(true);
  });

  it('hides search when searchThreshold is omitted', () => {
    const tracks = Array.from({ length: 10 }, (_, i) => createTrack(i));
    const { result } = renderHook(() => useTrackListState({ ...baseConfig, tracks, searchThreshold: undefined }));
    expect(result.current.showSearch).toBe(false);
  });

  it('handleDownloadAll downloads all tracks when none selected', () => {
    const onDownloadTracks = vi.fn();
    const config = { ...baseConfig, download: { path: '/dl', onDownloadTracks } };
    const { result } = renderHook(() => useTrackListState(config));

    act(() => result.current.handleDownloadAll());

    expect(onDownloadTracks).toHaveBeenCalledWith(config.tracks, 'Test Playlist', '/dl');
  });

  it('returns empty displayTracks when tracks is undefined', () => {
    const { result } = renderHook(() => useTrackListState({ ...baseConfig, tracks: undefined }));
    expect(result.current.displayTracks).toHaveLength(0);
    expect(result.current.showSearch).toBe(false);
  });

  it('exposes isDownloadEnabled from settings', () => {
    const { result } = renderHook(() => useTrackListState(baseConfig));
    expect(result.current.isDownloadEnabled).toBe(true);
  });

  it('canExclude is true when playlistId is defined', () => {
    const { result } = renderHook(() => useTrackListState({ ...baseConfig, playlistId: 'pl-1' }));
    expect(result.current.canExclude).toBe(true);
  });

  it('canExclude is false when playlistId is undefined', () => {
    const { result } = renderHook(() => useTrackListState(baseConfig));
    expect(result.current.canExclude).toBe(false);
  });

  it('canExclude is false when rekordbox is not found', () => {
    mockRekordboxStatus = { found: false };
    const { result } = renderHook(() => useTrackListState({ ...baseConfig, playlistId: 'pl-1' }));
    expect(result.current.canExclude).toBe(false);
  });

  it('canExclude is true when playlistId is set and rekordbox status is loading (undefined)', () => {
    mockRekordboxStatus = undefined;
    const { result } = renderHook(() => useTrackListState({ ...baseConfig, playlistId: 'pl-1' }));
    expect(result.current.canExclude).toBe(true);
  });

  it('download-selected path excludes already-downloaded tracks', () => {
    const track1 = createTrack(1);
    const track2 = createTrack(2);
    const track3 = createTrack(3);
    mockSelectedTracks = [track1, track2, track3];
    mockDownloadedIds = new Set([track2.id]);
    renderHook(() => useTrackListState({ ...baseConfig, playlistId: 'pl-1' }));
    expect(capturedDownloadableTracks).toEqual([track1, track3]);
  });

  it('handleExcludeSelected excludes selected ids and clears selection', () => {
    mockSelectedTracks = [createTrack(1), createTrack(2)];
    const { result } = renderHook(() => useTrackListState({ ...baseConfig, playlistId: 'pl-1' }));
    act(() => result.current.handleExcludeSelected());
    expect(mockExcludeTracks).toHaveBeenCalledWith('pl-1', [1, 2]);
    expect(mockClearSelection).toHaveBeenCalled();
  });

  it('handleExcludeSelected is a no-op when playlistId is undefined', () => {
    mockSelectedTracks = [createTrack(1)];
    const { result } = renderHook(() => useTrackListState(baseConfig));
    act(() => result.current.handleExcludeSelected());
    expect(mockExcludeTracks).not.toHaveBeenCalled();
  });

  describe('nonSelectableIds', () => {
    it('equals downloadedIds when rekordbox is not available (no playlistId)', () => {
      mockDownloadedIds = new Set([1, 2]);
      const { result } = renderHook(() => useTrackListState(baseConfig));
      expect(result.current.nonSelectableIds).toEqual(new Set([1, 2]));
    });

    it('equals downloadedIds when rekordbox is not found', () => {
      mockRekordboxStatus = { found: false };
      mockDownloadedIds = new Set([1]);
      const { result } = renderHook(() => useTrackListState({ ...baseConfig, playlistId: 'pl-1' }));
      expect(result.current.nonSelectableIds).toEqual(new Set([1]));
    });

    it('is only tracks both downloaded AND excluded when rekordbox is available', () => {
      const track1 = createTrack(1);
      const track2 = createTrack(2);
      const track3 = createTrack(3);
      mockDownloadedIds = new Set([1, 3]);
      mockExcludedIds = new Set([2, 3]);
      mockRekordboxStatus = { found: true };
      const { result } = renderHook(() => useTrackListState({ ...baseConfig, tracks: [track1, track2, track3], playlistId: 'pl-1' }));
      expect(result.current.nonSelectableIds).toEqual(new Set([3]));
    });

    it('downloaded-not-excluded is selectable with rekordbox', () => {
      const track1 = createTrack(1);
      mockDownloadedIds = new Set([1]);
      mockExcludedIds = new Set();
      mockRekordboxStatus = { found: true };
      const { result } = renderHook(() => useTrackListState({ ...baseConfig, tracks: [track1], playlistId: 'pl-1' }));
      expect(result.current.nonSelectableIds?.has(1)).toBe(false);
    });

    it('excluded-not-downloaded is selectable with rekordbox', () => {
      const track2 = createTrack(2);
      mockDownloadedIds = new Set();
      mockExcludedIds = new Set([2]);
      mockRekordboxStatus = { found: true };
      const { result } = renderHook(() => useTrackListState({ ...baseConfig, tracks: [track2], playlistId: 'pl-1' }));
      expect(result.current.nonSelectableIds?.has(2)).toBe(false);
    });
  });

  describe('syncQueue guard', () => {
    beforeEach(() => {
      mockCurrentTrackId = undefined;
      mockPlayTrack.mockClear();
      mockSyncQueue.mockClear();
    });

    it('does not call syncQueue when streaming ends without playTrack called', () => {
      mockCurrentTrackId = 1;
      const { rerender } = renderHook(({ isStreaming }) => useTrackListState({ ...baseConfig, isStreaming }), {
        initialProps: { isStreaming: true },
      });

      rerender({ isStreaming: false });

      expect(mockSyncQueue).not.toHaveBeenCalled();
    });

    it('calls syncQueue when streaming ends after playTrack was called', () => {
      mockCurrentTrackId = 1;
      const { result, rerender } = renderHook(({ isStreaming }) => useTrackListState({ ...baseConfig, isStreaming }), {
        initialProps: { isStreaming: false },
      });

      act(() => result.current.playTrack(0));
      rerender({ isStreaming: true });
      rerender({ isStreaming: false });

      expect(mockSyncQueue).toHaveBeenCalledTimes(1);
    });

    it('resets playedFromHere flag when resetKey changes', () => {
      mockCurrentTrackId = 1;
      const { result, rerender } = renderHook(
        ({ isStreaming, resetKey }: { isStreaming: boolean; resetKey?: string }) =>
          useTrackListState({ ...baseConfig, isStreaming, resetKey }),
        { initialProps: { isStreaming: false, resetKey: 'a' } },
      );

      act(() => result.current.playTrack(0));
      rerender({ isStreaming: false, resetKey: 'b' });
      rerender({ isStreaming: true, resetKey: 'b' });
      rerender({ isStreaming: false, resetKey: 'b' });

      expect(mockSyncQueue).not.toHaveBeenCalled();
    });

    it('playTrack delegates to underlying rawPlayTrack', () => {
      const { result } = renderHook(() => useTrackListState(baseConfig));

      act(() => result.current.playTrack(0));

      expect(mockPlayTrack).toHaveBeenCalledWith(0);
    });
  });
});
