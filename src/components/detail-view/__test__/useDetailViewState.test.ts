import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetailViewState } from '../hooks/useDetailViewState';
import type { TrackInfo } from '@/bindings';

const mockPlayTrack = vi.fn();
const mockSyncQueue = vi.fn();
const mockDownloadTrack = vi.fn();
const mockHandleDownloadSelected = vi.fn();
const mockSetSearchQuery = vi.fn();

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
    downloadedIds: new Set<number>(),
    downloadedCount: 0,
  }),
}));

vi.mock('@/hooks/useTrackSelection', () => ({
  useTrackSelection: () => ({
    selectedIds: new Set<number>(),
    toggleTrack: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: vi.fn(),
    selectedCount: 0,
    isAllSelected: false,
    selectedTracks: [],
    selectableCount: 0,
  }),
}));

vi.mock('@/features/player/hooks/usePlayContext', () => ({
  usePlayContext: () => ({ playTrack: mockPlayTrack, syncQueue: mockSyncQueue }),
}));

vi.mock('@/features/player/store', () => ({
  usePlayerStore: () => undefined,
}));

vi.mock('@/hooks/useDownloadSelected', () => ({
  useDownloadSelected: () => mockHandleDownloadSelected,
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

const createTrack = (id: number) => ({
  id,
  title: `Track ${id}`,
  user: { id: 0, username: 'Artist', avatar_url: null },
  duration: 180000,
  artwork_url: null,
  permalink_url: `https://soundcloud.com/artist/track-${id}`,
}) as TrackInfo;

describe('useDetailViewState', () => {
  const baseConfig = {
    tracks: [createTrack(1), createTrack(2), createTrack(3)] as TrackInfo[],
    isLoading: false,
    title: 'Test Playlist',
    download: { path: '/downloads', onDownloadTracks: vi.fn() },
    searchThreshold: 5,
  };

  it('returns displayTracks from search filter', () => {
    const { result } = renderHook(() => useDetailViewState(baseConfig));
    expect(result.current.displayTracks).toHaveLength(3);
  });

  it('hides search when tracks below threshold', () => {
    const { result } = renderHook(() => useDetailViewState(baseConfig));
    expect(result.current.showSearch).toBe(false);
  });

  it('shows search when tracks at or above threshold', () => {
    const tracks = Array.from({ length: 5 }, (_, i) => createTrack(i));
    const { result } = renderHook(() =>
      useDetailViewState({ ...baseConfig, tracks }),
    );
    expect(result.current.showSearch).toBe(true);
  });

  it('hides search when searchThreshold is omitted', () => {
    const tracks = Array.from({ length: 10 }, (_, i) => createTrack(i));
    const { result } = renderHook(() =>
      useDetailViewState({ ...baseConfig, tracks, searchThreshold: undefined }),
    );
    expect(result.current.showSearch).toBe(false);
  });

  it('handleDownloadAll downloads all tracks when none selected', () => {
    const onDownloadTracks = vi.fn();
    const config = { ...baseConfig, download: { path: '/dl', onDownloadTracks } };
    const { result } = renderHook(() => useDetailViewState(config));

    act(() => result.current.handleDownloadAll());

    expect(onDownloadTracks).toHaveBeenCalledWith(config.tracks, 'Test Playlist', '/dl');
  });

  it('returns empty displayTracks when tracks is undefined', () => {
    const { result } = renderHook(() =>
      useDetailViewState({ ...baseConfig, tracks: undefined }),
    );
    expect(result.current.displayTracks).toHaveLength(0);
    expect(result.current.showSearch).toBe(false);
  });

  it('exposes isDownloadEnabled from settings', () => {
    const { result } = renderHook(() => useDetailViewState(baseConfig));
    expect(result.current.isDownloadEnabled).toBe(true);
  });
});
