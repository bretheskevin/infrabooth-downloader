import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInitializeSettings } from '../useInitializeSettings';

// Mock the settings lib
vi.mock('@/features/settings/api/settings', () => ({
  getDefaultDownloadPath: vi.fn(),
  validateDownloadPath: vi.fn(),
}));

// Mock the settings store
const mockSetDownloadPath = vi.fn();
const mockSetHasHydrated = vi.fn();

let mockStoreState = {
  downloadPath: '',
  language: 'en' as const,
  _hasHydrated: false,
  setDownloadPath: mockSetDownloadPath,
  setLanguage: vi.fn(),
  _setHasHydrated: mockSetHasHydrated,
};

vi.mock('@/features/settings/store', () => ({
  useSettingsStore: (selector: (state: typeof mockStoreState) => unknown) => {
    if (selector) {
      return selector(mockStoreState);
    }
    return mockStoreState;
  },
  useSettingsHydrated: () => mockStoreState._hasHydrated,
}));

import { getDefaultDownloadPath, validateDownloadPath } from '@/features/settings/api/settings';

describe('useInitializeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      downloadPath: '',
      language: 'en',
      _hasHydrated: false,
      setDownloadPath: mockSetDownloadPath,
      setLanguage: vi.fn(),
      _setHasHydrated: mockSetHasHydrated,
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should not initialize before hydration', () => {
    mockStoreState._hasHydrated = false;

    const { result } = renderHook(() => useInitializeSettings());

    expect(result.current.isInitialized).toBe(false);
    expect(getDefaultDownloadPath).not.toHaveBeenCalled();
    expect(validateDownloadPath).not.toHaveBeenCalled();
  });

  it('should set default path on first launch (empty downloadPath)', async () => {
    mockStoreState._hasHydrated = true;
    mockStoreState.downloadPath = '';
    vi.mocked(getDefaultDownloadPath).mockResolvedValue('/Users/test/Downloads');

    renderHook(() => useInitializeSettings());

    await waitFor(() => {
      expect(getDefaultDownloadPath).toHaveBeenCalled();
    });

    expect(mockSetDownloadPath).toHaveBeenCalledWith('/Users/test/Downloads');
    expect(validateDownloadPath).not.toHaveBeenCalled();
  });

  it('should not change valid path on subsequent launch', async () => {
    mockStoreState._hasHydrated = true;
    mockStoreState.downloadPath = '/Users/test/Music';
    vi.mocked(validateDownloadPath).mockResolvedValue(true);

    renderHook(() => useInitializeSettings());

    await waitFor(() => {
      expect(validateDownloadPath).toHaveBeenCalledWith('/Users/test/Music');
    });

    expect(mockSetDownloadPath).not.toHaveBeenCalled();
  });

  it('should reset to default when saved path is invalid', async () => {
    mockStoreState._hasHydrated = true;
    mockStoreState.downloadPath = '/deleted/folder';
    vi.mocked(validateDownloadPath).mockResolvedValue(false);
    vi.mocked(getDefaultDownloadPath).mockResolvedValue('/Users/test/Downloads');

    renderHook(() => useInitializeSettings());

    await waitFor(() => {
      expect(validateDownloadPath).toHaveBeenCalledWith('/deleted/folder');
    });

    await waitFor(() => {
      expect(getDefaultDownloadPath).toHaveBeenCalled();
    });

    expect(mockSetDownloadPath).toHaveBeenCalledWith('/Users/test/Downloads');
  });

  it('should handle getDefaultDownloadPath failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStoreState._hasHydrated = true;
    mockStoreState.downloadPath = '';
    vi.mocked(getDefaultDownloadPath).mockRejectedValue(new Error('Failed'));

    renderHook(() => useInitializeSettings());

    await waitFor(() => {
      expect(getDefaultDownloadPath).toHaveBeenCalled();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to get default download path:',
      expect.any(Error)
    );
    expect(mockSetDownloadPath).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
