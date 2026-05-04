import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { TrackInfo, ExportResult } from '@/bindings';
import { useRekordboxExport } from '../hooks/useRekordboxExport';

const { mockExportPlaylistToRekordbox } = vi.hoisted(() => ({
  mockExportPlaylistToRekordbox: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  api: {
    exportPlaylistToRekordbox: mockExportPlaylistToRekordbox,
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
    }
  },
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: {
    getState: () => ({ maxConcurrentDownloads: 3 }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockTrack: TrackInfo = {
  id: 1,
  title: 'Test Track',
  user: {
    id: 42,
    username: 'TestArtist',
    avatar_url: null,
  },
  artwork_url: null,
  duration: 180000,
  permalink_url: 'https://soundcloud.com/testartist/test-track',
  waveform_url: null,
  downloadable: false,
  download_url: null,
};

const mockResult: ExportResult = {
  exportedCount: 1,
  skippedCount: 0,
  playlistName: 'Test Playlist',
  errors: [],
};

describe('useRekordboxExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in idle phase', () => {
    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    expect(result.current.phase).toBe('idle');
    expect(result.current.trackStatuses.size).toBe(0);
    expect(result.current.totalTracks).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.errorCode).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to confirm phase on openConfirm', () => {
    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    act(() => {
      result.current.openConfirm();
    });

    expect(result.current.phase).toBe('confirm');
  });

  it('transitions back to idle on close', () => {
    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    act(() => {
      result.current.openConfirm();
    });
    expect(result.current.phase).toBe('confirm');

    act(() => {
      result.current.close();
    });
    expect(result.current.phase).toBe('idle');
  });

  it('transitions to complete on successful export', async () => {
    mockExportPlaylistToRekordbox.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startExport();
    });

    expect(result.current.phase).toBe('complete');
    expect(result.current.result).toEqual(mockResult);
    expect(result.current.error).toBeNull();
  });

  it('passes maxConcurrent and null parentFolderId from settings store', async () => {
    mockExportPlaylistToRekordbox.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startExport();
    });

    expect(mockExportPlaylistToRekordbox).toHaveBeenCalledWith(expect.any(Array), 'Test Playlist', null, 3);
  });

  it('starts with undefined selectedFolderId', () => {
    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });
    expect(result.current.selectedFolderId).toBeUndefined();
  });

  it('updates selectedFolderId via setSelectedFolderId', () => {
    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    act(() => {
      result.current.setSelectedFolderId('folder-123');
    });

    expect(result.current.selectedFolderId).toBe('folder-123');
  });

  it('passes selectedFolderId to export API', async () => {
    mockExportPlaylistToRekordbox.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    act(() => {
      result.current.setSelectedFolderId('folder-456');
    });

    await act(async () => {
      await result.current.startExport();
    });

    expect(mockExportPlaylistToRekordbox).toHaveBeenCalledWith(expect.any(Array), 'Test Playlist', 'folder-456', 3);
  });

  it('uses folderId override when passed to startExport', async () => {
    mockExportPlaylistToRekordbox.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startExport('override-folder');
    });

    expect(mockExportPlaylistToRekordbox).toHaveBeenCalledWith(expect.any(Array), 'Test Playlist', 'override-folder', 3);
  });

  it('transitions to error on failed export', async () => {
    mockExportPlaylistToRekordbox.mockRejectedValue(new Error('Export failed'));

    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startExport();
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.errorCode).toBeNull();
    expect(result.current.error).toBe('Export failed');
    expect(result.current.result).toBeNull();
  });

  it('captures error code from ApiError', async () => {
    const { ApiError } = await import('@/lib/tauri');
    mockExportPlaylistToRekordbox.mockRejectedValue(new ApiError('REKORDBOX_RUNNING', 'Rekordbox is running'));

    const { result } = renderHook(() => useRekordboxExport([mockTrack], 'Test Playlist'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.startExport();
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.errorCode).toBe('REKORDBOX_RUNNING');
    expect(result.current.error).toBe('Rekordbox is running');
  });
});
