import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

const mockDeletePlaylist = vi.fn();
const mockRemovePlaylistFromLibraryCache = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    deletePlaylist: (...args: unknown[]) => mockDeletePlaylist(...args),
    removePlaylistFromLibraryCache: (...args: unknown[]) => mockRemovePlaylistFromLibraryCache(...args),
  },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

vi.mock('@/lib/errorMessages', () => ({
  isAntibotError: (err: unknown) => err instanceof Error && err.message === 'antibot',
}));

vi.mock('@/lib/utils', () => ({
  getErrorString: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import { useDeletePlaylist } from '../useDeletePlaylist';

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useDeletePlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRemovePlaylistFromLibraryCache.mockResolvedValue(undefined);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns deletePlaylist function and isDeleting false initially', () => {
    const { result } = renderHook(() => useDeletePlaylist(), { wrapper });
    expect(result.current.deletePlaylist).toBeTypeOf('function');
    expect(result.current.isDeleting).toBe(false);
  });

  it('calls api.deletePlaylist and shows success toast', async () => {
    mockDeletePlaylist.mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDeletePlaylist(onSuccess), { wrapper });

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.deletePlaylist(123);
    });

    expect(returnValue).toBe(true);
    expect(mockDeletePlaylist).toHaveBeenCalledWith(123);
    expect(mockToastSuccess).toHaveBeenCalledWith('playlistMenu.deleted');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('optimistically removes playlist from cache on success', async () => {
    mockDeletePlaylist.mockResolvedValue(undefined);
    const playlists = [
      { id: 123, title: 'To Delete' },
      { id: 456, title: 'Keep' },
    ];
    queryClient.setQueryData(['library-playlists', 'testuser'], playlists);

    const { result } = renderHook(() => useDeletePlaylist(), { wrapper });

    await act(async () => {
      await result.current.deletePlaylist(123);
    });

    const cached = queryClient.getQueryData<{ id: number }[]>(['library-playlists', 'testuser']);
    expect(cached).toEqual([{ id: 456, title: 'Keep' }]);
  });

  it('shows error toast on failure', async () => {
    mockDeletePlaylist.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useDeletePlaylist(), { wrapper });

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.deletePlaylist(123);
    });

    expect(returnValue).toBe(false);
    expect(mockToastError).toHaveBeenCalled();
  });

  it('shows antibot error message when antibot error detected', async () => {
    mockDeletePlaylist.mockRejectedValue(new Error('antibot'));
    const { result } = renderHook(() => useDeletePlaylist(), { wrapper });

    await act(async () => {
      await result.current.deletePlaylist(123);
    });

    expect(mockToastError).toHaveBeenCalledWith('errors.antibotBlocked');
  });

  it('does not call onSuccess on failure', async () => {
    mockDeletePlaylist.mockRejectedValue(new Error('fail'));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDeletePlaylist(onSuccess), { wrapper });

    await act(async () => {
      await result.current.deletePlaylist(123);
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
