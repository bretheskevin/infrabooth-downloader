import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import type { RekordboxTreeNode } from '@/bindings';
import { useRekordboxTree } from '../hooks/useRekordboxTree';

const mockGetRekordboxPlaylistTree = vi.fn();

vi.mock('@/lib/tauri', () => ({
  api: {
    getRekordboxPlaylistTree: (...args: unknown[]) => mockGetRekordboxPlaylistTree(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockNodes: RekordboxTreeNode[] = [
  { id: '1', name: 'Folder A', parentId: 'root', attribute: 1, seq: 1 },
  { id: '2', name: 'Playlist B', parentId: 'root', attribute: 0, seq: 2 },
];

describe('useRekordboxTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useRekordboxTree(false), { wrapper: createWrapper() });
    expect(mockGetRekordboxPlaylistTree).not.toHaveBeenCalled();
  });

  it('fetches tree when enabled', async () => {
    mockGetRekordboxPlaylistTree.mockResolvedValue(mockNodes);
    const { result } = renderHook(() => useRekordboxTree(true), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockNodes);
    expect(mockGetRekordboxPlaylistTree).toHaveBeenCalledOnce();
  });

  it('returns error when fetch fails', async () => {
    mockGetRekordboxPlaylistTree.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useRekordboxTree(true), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
