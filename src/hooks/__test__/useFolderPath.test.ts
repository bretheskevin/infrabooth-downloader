import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFolderPath } from '../useFolderPath';

const mockSelectFolder = vi.fn();
let mockSetPlaylistDownloadPath = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let mockDownloadPath = '/default/path';
let mockPlaylistPaths: Record<string, string> = {};

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      downloadPath: mockDownloadPath,
      playlistDownloadPaths: mockPlaylistPaths,
      setPlaylistDownloadPath: mockSetPlaylistDownloadPath,
    }),
}));

let capturedOnSelected: ((path: string) => void) | undefined;

vi.mock('../useFolderSelection', () => ({
  useFolderSelection: (options: { onSelected: (path: string) => void }) => {
    capturedOnSelected = options.onSelected;
    return {
      selectFolder: mockSelectFolder,
      error: null,
    };
  },
}));

vi.mock('@/lib/utils', () => ({
  getFolderName: (path: string) => path.split('/').pop(),
}));

describe('useFolderPath', () => {
  beforeEach(() => {
    mockDownloadPath = '/default/path';
    mockPlaylistPaths = {};
    mockSetPlaylistDownloadPath = vi.fn();
    capturedOnSelected = undefined;
  });

  it('returns defaultPath as effectivePath initially', () => {
    const { result } = renderHook(() => useFolderPath());
    expect(result.current.effectivePath).toBe('/default/path');
  });

  it('derives folderName from effectivePath', () => {
    const { result } = renderHook(() => useFolderPath());
    expect(result.current.folderName).toBe('path');
  });

  it('isCustomFolder is false when no local path set', () => {
    const { result } = renderHook(() => useFolderPath());
    expect(result.current.isCustomFolder).toBe(false);
  });

  it('exposes selectFolder from useFolderSelection', () => {
    const { result } = renderHook(() => useFolderPath());
    expect(result.current.selectFolder).toBe(mockSelectFolder);
  });

  it('resetLocalPath is a stable function', () => {
    const { result, rerender } = renderHook(() => useFolderPath());
    const first = result.current.resetLocalPath;
    rerender();
    expect(result.current.resetLocalPath).toBe(first);
  });

  describe('without playlistId — ephemeral session behavior', () => {
    it('onSelected updates effectivePath via local state', () => {
      const { result } = renderHook(() => useFolderPath());
      expect(capturedOnSelected).toBeDefined();

      act(() => {
        capturedOnSelected!('/picked');
      });

      expect(result.current.effectivePath).toBe('/picked');
    });

    it('onSelected does not call setPlaylistDownloadPath', () => {
      renderHook(() => useFolderPath());

      act(() => {
        capturedOnSelected!('/picked');
      });

      expect(mockSetPlaylistDownloadPath).not.toHaveBeenCalled();
    });
  });

  describe('with playlistId', () => {
    it('uses saved playlist path as effectivePath when available', () => {
      mockPlaylistPaths = { 'pl-1': '/playlist/path' };
      const { result } = renderHook(() => useFolderPath(true, 'pl-1'));
      expect(result.current.effectivePath).toBe('/playlist/path');
    });

    it('falls back to global path when no saved playlist path', () => {
      mockPlaylistPaths = {};
      const { result } = renderHook(() => useFolderPath(true, 'pl-1'));
      expect(result.current.effectivePath).toBe('/default/path');
    });

    it('ignores saved playlist paths for other playlist ids', () => {
      mockPlaylistPaths = { 'pl-other': '/other/path' };
      const { result } = renderHook(() => useFolderPath(true, 'pl-1'));
      expect(result.current.effectivePath).toBe('/default/path');
    });

    it('isCustomFolder is true when saved playlist path differs from global default', () => {
      mockPlaylistPaths = { 'pl-1': '/playlist/path' };
      const { result } = renderHook(() => useFolderPath(true, 'pl-1'));
      expect(result.current.isCustomFolder).toBe(true);
    });

    it('isCustomFolder is false when saved playlist path equals global default', () => {
      mockPlaylistPaths = { 'pl-1': '/default/path' };
      const { result } = renderHook(() => useFolderPath(true, 'pl-1'));
      expect(result.current.isCustomFolder).toBe(false);
    });

    it('derives folderName from saved playlist path', () => {
      mockPlaylistPaths = { 'pl-1': '/my/custom/music' };
      const { result } = renderHook(() => useFolderPath(true, 'pl-1'));
      expect(result.current.folderName).toBe('music');
    });

    it('onSelected persists path via setPlaylistDownloadPath', () => {
      mockPlaylistPaths = {};
      renderHook(() => useFolderPath(true, 'pl-1'));

      act(() => {
        capturedOnSelected!('/picked');
      });

      expect(mockSetPlaylistDownloadPath).toHaveBeenCalledWith('pl-1', '/picked');
    });

    it('onSelected does not change ephemeral local state', () => {
      mockPlaylistPaths = {};
      const { result } = renderHook(() => useFolderPath(true, 'pl-1'));

      act(() => {
        capturedOnSelected!('/picked');
      });

      // effectivePath should still be derived from store, not local state
      // Since mock store doesn't update, it stays as the global default
      expect(result.current.effectivePath).toBe('/default/path');
    });
  });
});
