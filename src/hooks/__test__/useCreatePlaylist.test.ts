import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

const mockCreatePlaylist = vi.fn();
const mockClearLibraryCache = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    createPlaylist: (...args: unknown[]) => mockCreatePlaylist(...args),
    clearLibraryCache: (...args: unknown[]) => mockClearLibraryCache(...args),
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

import { useCreatePlaylist } from '../useCreatePlaylist';

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCreatePlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearLibraryCache.mockResolvedValue(undefined);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns createPlaylist function and isCreating false initially', () => {
    const { result } = renderHook(() => useCreatePlaylist(), { wrapper });
    expect(result.current.createPlaylist).toBeTypeOf('function');
    expect(result.current.isCreating).toBe(false);
  });

  it('calls api.createPlaylist and shows success toast', async () => {
    mockCreatePlaylist.mockResolvedValue({ id: 123, permalink_url: 'https://soundcloud.com/test' });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreatePlaylist(onSuccess), { wrapper });

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.createPlaylist('My Playlist', 'private', 42);
    });

    expect(returnValue).toBe(true);
    expect(mockCreatePlaylist).toHaveBeenCalledWith('My Playlist', 'private', 42);
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('trackMenu.createdPlaylist'));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('invalidates library-playlists and owned-playlists-for-track queries on success', async () => {
    mockCreatePlaylist.mockResolvedValue({ id: 123, permalink_url: 'https://soundcloud.com/test' });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePlaylist(), { wrapper });

    await act(async () => {
      await result.current.createPlaylist('Test', 'private', 42);
    });

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['library-playlists'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['owned-playlists-for-track', 42] }));
  });

  it('shows error toast on failure', async () => {
    mockCreatePlaylist.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useCreatePlaylist(), { wrapper });

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.createPlaylist('Test', 'private', 42);
    });

    expect(returnValue).toBe(false);
    expect(mockToastError).toHaveBeenCalled();
  });

  it('shows antibot error message when antibot error detected', async () => {
    mockCreatePlaylist.mockRejectedValue(new Error('antibot'));
    const { result } = renderHook(() => useCreatePlaylist(), { wrapper });

    await act(async () => {
      await result.current.createPlaylist('Test', 'private', 42);
    });

    expect(mockToastError).toHaveBeenCalledWith('errors.antibotBlocked');
  });

  it('does not call onSuccess on failure', async () => {
    mockCreatePlaylist.mockRejectedValue(new Error('fail'));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCreatePlaylist(onSuccess), { wrapper });

    await act(async () => {
      await result.current.createPlaylist('Test', 'private', 42);
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
