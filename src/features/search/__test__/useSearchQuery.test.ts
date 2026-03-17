import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSearchQuery } from '../hooks/useSearchQuery';
import { useSearchStore } from '../store';

const mockSearchTracks = vi.fn();
vi.mock('@/lib/tauri', () => ({
  api: {
    searchTracks: (...args: unknown[]) => mockSearchTracks(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
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
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => result.current.handleInputChange('test'));
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
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => result.current.handleInputChange('  hello  '));
    act(() => vi.advanceTimersByTime(400));
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockSearchTracks).toHaveBeenCalledWith('hello', 20, 0);
    });
  });

  it('does not search for empty string', () => {
    const { result } = renderHook(() => useSearchQuery(), { wrapper: createWrapper() });

    act(() => result.current.handleInputChange(''));
    act(() => vi.advanceTimersByTime(400));

    expect(mockSearchTracks).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });
});
