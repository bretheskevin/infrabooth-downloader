import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useArtistSearchQuery } from '../hooks/useArtistSearchQuery';
import { useSearchStore } from '../store';

const mockSearchUsers = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useArtistSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useSearchStore.getState().setInputValue('');
    useSearchStore.getState().setSearchType('artists');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty results and hasSearched false', () => {
    const { result } = renderHook(() => useArtistSearchQuery(), { wrapper: createWrapper() });
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('debounces input before searching', async () => {
    mockSearchUsers.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => useArtistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('deadmau5'));
    expect(mockSearchUsers).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchUsers).toHaveBeenCalledWith('deadmau5', 20, 0);
    });
  });

  it('does not search for empty string', () => {
    renderHook(() => useArtistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue(''));
    act(() => vi.advanceTimersByTime(400));

    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it('trims whitespace from query', async () => {
    mockSearchUsers.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => useArtistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('  bonobo  '));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchUsers).toHaveBeenCalledWith('bonobo', 20, 0);
    });
  });

  it('returns flattened results from pages', async () => {
    const mockUser = { id: 1, username: 'Artist1', avatar_url: null, followers_count: 100, track_count: 10, permalink_url: 'https://soundcloud.com/artist1' };
    mockSearchUsers.mockResolvedValue({ collection: [mockUser], total_results: 1 });
    const { result } = renderHook(() => useArtistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('artist'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0]?.username).toBe('Artist1');
    });
  });

  it('treats SoundCloud URLs as regular keyword search', async () => {
    mockSearchUsers.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => useArtistSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('https://soundcloud.com/someartist'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchUsers).toHaveBeenCalled();
    });
  });
});
