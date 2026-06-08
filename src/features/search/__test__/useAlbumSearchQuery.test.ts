import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAlbumSearchQuery } from '../hooks/useAlbumSearchQuery';
import { useSearchStore } from '../store';

const mockSearchAlbums = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    searchAlbums: (...args: unknown[]) => mockSearchAlbums(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAlbumSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useSearchStore.getState().setInputValue('');
    useSearchStore.getState().setSearchType('albums');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty results and hasSearched false', () => {
    const { result } = renderHook(() => useAlbumSearchQuery(), { wrapper: createWrapper() });
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('debounces input before searching', async () => {
    mockSearchAlbums.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => useAlbumSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('ambient'));
    expect(mockSearchAlbums).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchAlbums).toHaveBeenCalledWith('ambient', 20, 0);
    });
  });

  it('does not search for empty string', () => {
    renderHook(() => useAlbumSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue(''));
    act(() => vi.advanceTimersByTime(400));

    expect(mockSearchAlbums).not.toHaveBeenCalled();
  });

  it('trims whitespace from query', async () => {
    mockSearchAlbums.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => useAlbumSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('  studio album  '));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchAlbums).toHaveBeenCalledWith('studio album', 20, 0);
    });
  });

  it('returns flattened results from pages', async () => {
    const mockAlbum = {
      id: 1,
      title: 'Studio Album',
      artwork_url: null,
      track_count: 12,
      created_at: '2026-03-15T00:00:00Z',
      permalink_url: 'https://soundcloud.com/artist/sets/studio-album',
      secret_token: null,
      duration: 3600,
      user: { id: 100, username: 'TestArtist' },
    };
    mockSearchAlbums.mockResolvedValue({ collection: [mockAlbum], total_results: 1 });
    const { result } = renderHook(() => useAlbumSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('studio'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0]?.title).toBe('Studio Album');
    });
  });
});
