import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResourceSearch } from '../useResourceSearch';

const host = 'localhost:3000';
const token = 'token123';

describe('useResourceSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has initial state with loading=false and empty results', () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useResourceSearch(host, token, '', fetcher));

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it('calls fetcher with host, token, and query when query is non-empty', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => useResourceSearch(host, token, 'test', fetcher));

    await act(async () => {});

    expect(fetcher).toHaveBeenCalledWith(host, token, 'test');
    expect(result.current.results).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.loading).toBe(false);
  });

  it('does not call fetcher when query is empty', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    renderHook(() => useResourceSearch(host, token, '', fetcher));

    await act(async () => {});

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not call fetcher when query is whitespace only', async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    renderHook(() => useResourceSearch(host, token, '   ', fetcher));

    await act(async () => {});

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('clears results when query becomes empty', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1 }]);
    const { result, rerender } = renderHook(({ q }: { q: string }) => useResourceSearch(host, token, q, fetcher), {
      initialProps: { q: 'hello' },
    });

    await act(async () => {});
    expect(result.current.results).toEqual([{ id: 1 }]);

    await act(async () => {
      rerender({ q: '' });
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sets empty results on fetch error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useResourceSearch(host, token, 'test', fetcher));

    await act(async () => {});

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('ignores results from stale fetch when query changes', async () => {
    let resolveFirst!: (v: { id: number }[]) => void;
    const first = new Promise<{ id: number }[]>((r) => {
      resolveFirst = r;
    });
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce([{ id: 2 }]);

    const { result, rerender } = renderHook(({ q }: { q: string }) => useResourceSearch(host, token, q, fetcher), {
      initialProps: { q: 'a' },
    });

    await act(async () => {
      rerender({ q: 'b' });
    });

    await act(async () => {
      resolveFirst([{ id: 1 }]);
    });

    expect(result.current.results).toEqual([{ id: 2 }]);
  });
});
