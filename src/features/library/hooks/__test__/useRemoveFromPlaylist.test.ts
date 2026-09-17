import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useRemoveFromPlaylist } from '../useRemoveFromPlaylist';
import type { LibraryPlaylist, TrackInfo } from '@/bindings';

const mockRemove = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: { removeTrackFromPlaylist: (...args: unknown[]) => mockRemove(...args) },
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/errorMessages', () => ({ isAntibotError: () => false }));

const LIBRARY_KEY = ['library-playlists', 'me'] as const;

function makeLibraryPlaylist(id: number, trackCount: number): LibraryPlaylist {
  return {
    id,
    title: `Playlist ${id}`,
    username: 'user',
    user_id: 100,
    artwork_url: null,
    track_count: trackCount,
    duration: 3600,
    permalink_url: `https://soundcloud.com/user/sets/playlist-${id}`,
    is_owned: true,
    is_public: true,
    secret_token: null,
  };
}

const track = (id: number) => ({ id }) as unknown as TrackInfo;

let queryClient: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useRemoveFromPlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });

  it('decrements library track_count by one for a single instance', async () => {
    mockRemove.mockResolvedValue(undefined);
    queryClient.setQueryData(LIBRARY_KEY, [makeLibraryPlaylist(1, 3)]);
    queryClient.setQueryData(['playlist-tracks', 1], [track(10), track(20), track(30)]);
    const { result } = renderHook(() => useRemoveFromPlaylist(), { wrapper });

    await act(async () => {
      await result.current.removeFromPlaylist(1, 'Playlist 1', 20);
    });

    expect(mockRemove).toHaveBeenCalledWith(1, 20);
    expect(queryClient.getQueryData<LibraryPlaylist[]>(LIBRARY_KEY)?.[0]?.track_count).toBe(2);
  });

  it('decrements by the number of duplicate instances removed', async () => {
    mockRemove.mockResolvedValue(undefined);
    queryClient.setQueryData(LIBRARY_KEY, [makeLibraryPlaylist(1, 4)]);
    queryClient.setQueryData(['playlist-tracks', 1], [track(10), track(20), track(20), track(30)]);
    const { result } = renderHook(() => useRemoveFromPlaylist(), { wrapper });

    await act(async () => {
      await result.current.removeFromPlaylist(1, 'Playlist 1', 20);
    });

    expect(mockRemove).toHaveBeenCalledWith(1, 20);
    expect(queryClient.getQueryData<LibraryPlaylist[]>(LIBRARY_KEY)?.[0]?.track_count).toBe(2);
  });

  it('rolls back library track_count on error', async () => {
    mockRemove.mockRejectedValue(new Error('boom'));
    queryClient.setQueryData(LIBRARY_KEY, [makeLibraryPlaylist(1, 3)]);
    queryClient.setQueryData(['playlist-tracks', 1], [track(10), track(20), track(30)]);
    const { result } = renderHook(() => useRemoveFromPlaylist(), { wrapper });

    await act(async () => {
      await result.current.removeFromPlaylist(1, 'Playlist 1', 20);
    });

    expect(mockToastError).toHaveBeenCalled();
    expect(queryClient.getQueryData<LibraryPlaylist[]>(LIBRARY_KEY)?.[0]?.track_count).toBe(3);
  });
});
