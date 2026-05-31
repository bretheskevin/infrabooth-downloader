import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { usePlaylistSearchQuery } from '../hooks/usePlaylistSearchQuery';
import { useSearchStore } from '../store';

const mockSearchPlaylists = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    searchPlaylists: (...args: unknown[]) => mockSearchPlaylists(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePlaylistSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useSearchStore.getState().setInputValue('');
    useSearchStore.getState().setSearchType('playlists');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty results and hasSearched false', () => {
    const { result } = renderHook(() => usePlaylistSearchQuery(), { wrapper: createWrapper() });
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('debounces input before searching', async () => {
    mockSearchPlaylists.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => usePlaylistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('chill'));
    expect(mockSearchPlaylists).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchPlaylists).toHaveBeenCalledWith('chill', 20, 0);
    });
  });

  it('does not search for empty string', () => {
    renderHook(() => usePlaylistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue(''));
    act(() => vi.advanceTimersByTime(400));

    expect(mockSearchPlaylists).not.toHaveBeenCalled();
  });

  it('trims whitespace from query', async () => {
    mockSearchPlaylists.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => usePlaylistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('  lofi beats  '));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchPlaylists).toHaveBeenCalledWith('lofi beats', 20, 0);
    });
  });

  it('returns flattened results from pages', async () => {
    const mockPlaylist = {
      id: 1,
      title: 'Chill Mix',
      artwork_url: null,
      track_count: 15,
      created_at: '2026-01-01T00:00:00Z',
      permalink_url: 'https://soundcloud.com/user/sets/chill-mix',
      secret_token: null,
      duration: 3600,
      user: { id: 100, username: 'ChillUser' },
    };
    mockSearchPlaylists.mockResolvedValue({ collection: [mockPlaylist], total_results: 1 });
    const { result } = renderHook(() => usePlaylistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('chill'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0]?.title).toBe('Chill Mix');
    });
  });
});
