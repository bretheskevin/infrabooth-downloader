import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFolderPath } from '../useFolderPath';

const mockSelectFolder = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: () => '/default/path',
}));

vi.mock('../useFolderSelection', () => ({
  useFolderSelection: () => ({
    selectFolder: mockSelectFolder,
    error: null,
  }),
}));

vi.mock('@/lib/utils', () => ({
  getFolderName: (path: string) => path.split('/').pop(),
}));

describe('useFolderPath', () => {
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
});
