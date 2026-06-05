import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { TrackInfo, LibraryPlaylist } from '@/bindings';

const mockUpdatePlaylist = vi.fn();
const mockClearLibraryCache = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    updatePlaylist: (...args: unknown[]) => mockUpdatePlaylist(...args),
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

import { useEditPlaylist } from '../useEditPlaylist';

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const fakeUser: TrackInfo['user'] = { id: 1, username: 'user', avatar_url: null };

function makeTrack(id: number): TrackInfo {
  return {
    id,
    title: `Track ${id}`,
    user: fakeUser,
    artwork_url: null,
    duration: 180000,
    permalink_url: `https://soundcloud.com/track/${id}`,
    waveform_url: null,
    downloadable: false,
    download_url: null,
  };
}

describe('useEditPlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClearLibraryCache.mockResolvedValue(undefined);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns editPlaylist function and isEditing false initially', () => {
    const { result } = renderHook(() => useEditPlaylist(), { wrapper });
    expect(result.current.editPlaylist).toBeTypeOf('function');
    expect(result.current.isEditing).toBe(false);
  });

  it('calls api.updatePlaylist with correct args and shows success toast', async () => {
    mockUpdatePlaylist.mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useEditPlaylist(onSuccess), { wrapper });

    const params = { playlistId: 123, title: 'New Title', sharing: 'public', trackIds: [1, 2, 3] };
    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.editPlaylist(params);
    });

    expect(returnValue).toBe(true);
    expect(mockUpdatePlaylist).toHaveBeenCalledWith(123, 'New Title', 'public', [1, 2, 3]);
    expect(mockToastSuccess).toHaveBeenCalledWith('playlistMenu.editSuccess:{"playlist":"New Title"}');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('invalidates playlist-tracks query on settled', async () => {
    mockUpdatePlaylist.mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useEditPlaylist(), { wrapper });

    const params = { playlistId: 456, title: 'Test', sharing: 'private', trackIds: [1] };
    await act(async () => {
      await result.current.editPlaylist(params);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlist-tracks', 456] });
  });

  it('invalidates playlist-artwork query after clearing library cache', async () => {
    mockUpdatePlaylist.mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useEditPlaylist(), { wrapper });

    const params = { playlistId: 789, title: 'Art Test', sharing: 'public', trackIds: [1, 2] };
    await act(async () => {
      await result.current.editPlaylist(params);
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlist-artwork', 789] });
      });
    });
  });

  it('shows error toast on failure and returns false', async () => {
    mockUpdatePlaylist.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useEditPlaylist(), { wrapper });

    const params = { playlistId: 123, title: 'Test', sharing: 'private', trackIds: [] };
    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.editPlaylist(params);
    });

    expect(returnValue).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith('playlistMenu.editFailed');
  });

  it('shows antibot error message when antibot error detected', async () => {
    mockUpdatePlaylist.mockRejectedValue(new Error('antibot'));
    const { result } = renderHook(() => useEditPlaylist(), { wrapper });

    const params = { playlistId: 123, title: 'Test', sharing: 'private', trackIds: [] };
    await act(async () => {
      await result.current.editPlaylist(params);
    });

    expect(mockToastError).toHaveBeenCalledWith('errors.antibotBlocked');
  });

  it('does not call onSuccess on failure', async () => {
    mockUpdatePlaylist.mockRejectedValue(new Error('fail'));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useEditPlaylist(onSuccess), { wrapper });

    const params = { playlistId: 123, title: 'Test', sharing: 'private', trackIds: [] };
    await act(async () => {
      await result.current.editPlaylist(params);
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('optimistically updates playlist-tracks cache to only kept tracks', async () => {
    const track1 = makeTrack(1);
    const track2 = makeTrack(2);
    const track3 = makeTrack(3);
    queryClient.setQueryData(['playlist-tracks', 100], [track1, track2, track3]);

    let resolveApi!: () => void;
    mockUpdatePlaylist.mockReturnValue(
      new Promise<void>((r) => {
        resolveApi = r;
      }),
    );

    const { result } = renderHook(() => useEditPlaylist(), { wrapper });

    act(() => {
      void result.current.editPlaylist({
        playlistId: 100,
        title: 'Updated',
        sharing: 'public',
        trackIds: [1, 3],
      });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<TrackInfo[]>(['playlist-tracks', 100]);
      expect(cached).toEqual([track1, track3]);
    });

    await act(async () => {
      resolveApi();
    });
  });

  it('optimistically patches library playlist list with new title and track count', async () => {
    const playlist: LibraryPlaylist = {
      id: 200,
      title: 'Old Title',
      username: 'user',
      user_id: 1,
      artwork_url: null,
      track_count: 5,
      duration: 600000,
      permalink_url: 'https://soundcloud.com/playlist/200',
      is_owned: true,
      is_public: false,
      secret_token: null,
    };
    queryClient.setQueryData(['library-playlists'], [playlist]);

    let resolveApi!: () => void;
    mockUpdatePlaylist.mockReturnValue(
      new Promise<void>((r) => {
        resolveApi = r;
      }),
    );

    const { result } = renderHook(() => useEditPlaylist(), { wrapper });

    act(() => {
      void result.current.editPlaylist({
        playlistId: 200,
        title: 'New Title',
        sharing: 'public',
        trackIds: [1, 2],
      });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<LibraryPlaylist[]>(['library-playlists']);
      expect(cached?.[0]).toMatchObject({
        title: 'New Title',
        is_public: true,
        track_count: 2,
      });
    });

    await act(async () => {
      resolveApi();
    });
  });

  it('rolls back cache on error', async () => {
    const track1 = makeTrack(1);
    const track2 = makeTrack(2);
    const track3 = makeTrack(3);
    const originalTracks = [track1, track2, track3];
    queryClient.setQueryData(['playlist-tracks', 300], originalTracks);

    const playlist: LibraryPlaylist = {
      id: 300,
      title: 'Original',
      username: 'user',
      user_id: 1,
      artwork_url: null,
      track_count: 3,
      duration: 540000,
      permalink_url: 'https://soundcloud.com/playlist/300',
      is_owned: true,
      is_public: true,
      secret_token: null,
    };
    queryClient.setQueryData(['library-playlists'], [playlist]);

    mockUpdatePlaylist.mockRejectedValue(new Error('server error'));

    const { result } = renderHook(() => useEditPlaylist(), { wrapper });

    await act(async () => {
      await result.current.editPlaylist({
        playlistId: 300,
        title: 'Changed',
        sharing: 'private',
        trackIds: [1],
      });
    });

    const cachedTracks = queryClient.getQueryData<TrackInfo[]>(['playlist-tracks', 300]);
    expect(cachedTracks).toEqual(originalTracks);

    const cachedPlaylists = queryClient.getQueryData<LibraryPlaylist[]>(['library-playlists']);
    expect(cachedPlaylists?.[0]).toMatchObject({
      title: 'Original',
      is_public: true,
      track_count: 3,
    });
  });
});
