import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useLikePlaylist, type LikePlaylistInput } from '../useLikePlaylist';
import type { LibraryPlaylist } from '@/bindings';

const mockLikePlaylist = vi.fn();
const mockUnlikePlaylist = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    likePlaylist: (...args: unknown[]) => mockLikePlaylist(...args),
    unlikePlaylist: (...args: unknown[]) => mockUnlikePlaylist(...args),
  },
}));

const mockToastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

vi.mock('@/lib/errorMessages', () => ({ getApiErrorMessage: (_err: unknown, _t: unknown, key: string) => key }));

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: { username: string }) => unknown) => selector({ username: 'me' }),
}));

const LIBRARY_KEY = ['library-playlists', 'me'] as const;

function makeInput(id: number): LikePlaylistInput {
  return {
    id,
    title: `Playlist ${id}`,
    artwork_url: null,
    permalink_url: `https://soundcloud.com/user/sets/playlist-${id}`,
    track_count: 5,
    username: 'user',
    user_id: 100,
    duration: 3600,
  };
}

function makeLibraryPlaylist(id: number, isOwned = false): LibraryPlaylist {
  return {
    id,
    title: `Playlist ${id}`,
    username: 'user',
    user_id: 100,
    artwork_url: null,
    track_count: 5,
    duration: 3600,
    permalink_url: `https://soundcloud.com/user/sets/playlist-${id}`,
    is_owned: isOwned,
    is_public: true,
    secret_token: null,
  };
}

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useLikePlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });

  it('returns undefined when no playlist input', () => {
    const { result } = renderHook(() => useLikePlaylist(undefined), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it('reports isLiked false when playlist absent from library', () => {
    const { result } = renderHook(() => useLikePlaylist(makeInput(1)), { wrapper });
    expect(result.current?.isLiked).toBe(false);
  });

  it('reports isLiked true when playlist present and not owned', () => {
    queryClient.setQueryData(LIBRARY_KEY, [makeLibraryPlaylist(1)]);
    const { result } = renderHook(() => useLikePlaylist(makeInput(1)), { wrapper });
    expect(result.current?.isLiked).toBe(true);
  });

  it('reports isLiked false for an owned playlist', () => {
    queryClient.setQueryData(LIBRARY_KEY, [makeLibraryPlaylist(1, true)]);
    const { result } = renderHook(() => useLikePlaylist(makeInput(1)), { wrapper });
    expect(result.current?.isLiked).toBe(false);
  });

  it('optimistically adds the playlist on like', async () => {
    mockLikePlaylist.mockResolvedValue(undefined);
    queryClient.setQueryData(LIBRARY_KEY, []);
    const { result } = renderHook(() => useLikePlaylist(makeInput(1)), { wrapper });

    act(() => result.current?.onToggle());

    await waitFor(() => {
      expect(result.current?.isLiked).toBe(true);
    });
    expect(mockLikePlaylist).toHaveBeenCalledWith(1);
    expect(queryClient.getQueryData<LibraryPlaylist[]>(LIBRARY_KEY)).toHaveLength(1);
  });

  it('optimistically removes the playlist on unlike', async () => {
    mockUnlikePlaylist.mockResolvedValue(undefined);
    queryClient.setQueryData(LIBRARY_KEY, [makeLibraryPlaylist(1)]);
    const { result } = renderHook(() => useLikePlaylist(makeInput(1)), { wrapper });

    act(() => result.current?.onToggle());

    await waitFor(() => {
      expect(result.current?.isLiked).toBe(false);
    });
    expect(mockUnlikePlaylist).toHaveBeenCalledWith(1);
    expect(queryClient.getQueryData<LibraryPlaylist[]>(LIBRARY_KEY)).toHaveLength(0);
  });

  it('rolls back and toasts on error', async () => {
    mockLikePlaylist.mockRejectedValue(new Error('boom'));
    queryClient.setQueryData(LIBRARY_KEY, []);
    const { result } = renderHook(() => useLikePlaylist(makeInput(1)), { wrapper });

    act(() => result.current?.onToggle());

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('playlistMenu.likeError');
    });
    expect(queryClient.getQueryData<LibraryPlaylist[]>(LIBRARY_KEY)).toHaveLength(0);
    expect(result.current?.isLiked).toBe(false);
  });
});
