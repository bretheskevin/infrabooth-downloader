import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useSearchStore } from '../store';

const mockSearchTracks = vi.fn();
const mockGetTrackInfo = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    searchTracks: (...args: unknown[]) => mockSearchTracks(...args),
    getTrackInfo: (...args: unknown[]) => mockGetTrackInfo(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useSearchStore.getState().setInputValue('');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty results and hasSearched false', () => {
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('debounces input before searching', async () => {
    mockSearchTracks.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('test'));
    expect(mockSearchTracks).not.toHaveBeenCalled();

    // Advance past the 400ms debounce
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchTracks).toHaveBeenCalledWith('test', 20, 0);
    });
  });

  it('trims whitespace from query', async () => {
    mockSearchTracks.mockResolvedValue({ collection: [], total_results: 0 });
    renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('  hello  '));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchTracks).toHaveBeenCalledWith('hello', 20, 0);
    });
  });

  it('does not search for empty string', () => {
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue(''));
    act(() => vi.advanceTimersByTime(400));

    expect(mockSearchTracks).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });

  it('resolves SoundCloud URL instead of searching', async () => {
    const mockTrack = { id: 1, title: 'Test Track', user: { id: 0, username: 'artist' } };
    mockGetTrackInfo.mockResolvedValue(mockTrack);
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('https://soundcloud.com/artist/track-name'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockGetTrackInfo).toHaveBeenCalledWith('https://soundcloud.com/artist/track-name');
    });
    expect(mockSearchTracks).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.results).toEqual([mockTrack]);
      expect(result.current.isUrlMode).toBe(true);
    });
  });

  it('resolves on.soundcloud.com short links', async () => {
    const mockTrack = { id: 2, title: 'Short Link Track' };
    mockGetTrackInfo.mockResolvedValue(mockTrack);
    renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('https://on.soundcloud.com/abc123'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockGetTrackInfo).toHaveBeenCalledWith('https://on.soundcloud.com/abc123');
    });
    expect(mockSearchTracks).not.toHaveBeenCalled();
  });

  it('resolves www.soundcloud.com URLs', async () => {
    const mockTrack = { id: 3, title: 'WWW Track' };
    mockGetTrackInfo.mockResolvedValue(mockTrack);
    renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('https://www.soundcloud.com/artist/track'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockGetTrackInfo).toHaveBeenCalledWith('https://www.soundcloud.com/artist/track');
    });
  });

  it('handles URL with query parameters', async () => {
    const mockTrack = { id: 4, title: 'Param Track' };
    mockGetTrackInfo.mockResolvedValue(mockTrack);
    renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('https://soundcloud.com/artist/track?ref=clipboard&si=abc'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockGetTrackInfo).toHaveBeenCalled();
    });
    expect(mockSearchTracks).not.toHaveBeenCalled();
  });

  it('uses text search for non-URL input', async () => {
    mockSearchTracks.mockResolvedValue({ collection: [], total_results: 0 });
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('some artist name'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchTracks).toHaveBeenCalledWith('some artist name', 20, 0);
    });
    expect(mockGetTrackInfo).not.toHaveBeenCalled();
    expect(result.current.isUrlMode).toBe(false);
  });

  it('reports hasNextPage false and isFetchingNextPage false in URL mode', async () => {
    mockGetTrackInfo.mockResolvedValue({ id: 1, title: 'Track' });
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('https://soundcloud.com/artist/track'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isFetchingNextPage).toBe(false);
  });

  it('sets error when URL resolve fails', async () => {
    mockGetTrackInfo.mockRejectedValue(new Error('Track not found'));
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => useSearchStore.getState().setInputValue('https://soundcloud.com/artist/deleted-track'));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.isUrlMode).toBe(true);
  });
});
