import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDownloadHistory, useRemoveHistoryEntry, useClearHistory } from '../hooks/useDownloadHistory';
import { api } from '@/lib/tauri';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/lib/tauri', () => ({
  api: {
    listDownloadHistory: vi.fn(),
    removeDownloadHistoryEntry: vi.fn(),
    clearDownloadHistory: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    QueryClientProvider({ client: queryClient, children });
}

describe('useDownloadHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches history entries', async () => {
    const mockEntries = [{ id: '1', title: 'Test', kind: 'Track' as const, tracks: [] }];
    vi.mocked(api.listDownloadHistory).mockResolvedValue(mockEntries as any);

    const { result } = renderHook(() => useDownloadHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(mockEntries));
  });

  it('returns empty array when no history', async () => {
    vi.mocked(api.listDownloadHistory).mockResolvedValue([]);

    const { result } = renderHook(() => useDownloadHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual([]));
  });
});

describe('useRemoveHistoryEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls remove API and invalidates query', async () => {
    vi.mocked(api.listDownloadHistory).mockResolvedValue([]);
    vi.mocked(api.removeDownloadHistoryEntry).mockResolvedValue(undefined);

    const { result } = renderHook(
      () => ({ query: useDownloadHistory(), remove: useRemoveHistoryEntry() }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      await result.current.remove.mutateAsync('entry-1');
    });

    expect(api.removeDownloadHistoryEntry).toHaveBeenCalledWith('entry-1');
  });
});

describe('useClearHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls clear API and invalidates query', async () => {
    vi.mocked(api.listDownloadHistory).mockResolvedValue([]);
    vi.mocked(api.clearDownloadHistory).mockResolvedValue(undefined);

    const { result } = renderHook(
      () => ({ query: useDownloadHistory(), clear: useClearHistory() }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      await result.current.clear.mutateAsync();
    });

    expect(api.clearDownloadHistory).toHaveBeenCalled();
  });
});
