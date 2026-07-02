import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWaveform } from '@remote/features/now-playing/hooks/useWaveform';

describe('useWaveform', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no url given', () => {
    const { result } = renderHook(() => useWaveform(null));
    expect(result.current.samples).toBeNull();
  });

  it('returns samples on successful fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ samples: [10, 20, 30] }),
    } as Response);

    const { result } = renderHook(() => useWaveform('https://wave.sndcdn.com/test.json'));
    await waitFor(() => expect(result.current.samples).toEqual([10, 20, 30]));
  });

  it('returns null when fetch returns non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { result } = renderHook(() => useWaveform('https://wave.sndcdn.com/test.json'));
    await waitFor(() => expect(result.current.samples).toBeNull());
  });

  it('returns null when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useWaveform('https://wave.sndcdn.com/test.json'));
    await waitFor(() => expect(result.current.samples).toBeNull());
  });

  it('resets samples to null when url becomes null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ samples: [1, 2, 3] }),
    } as Response);

    const { result, rerender } = renderHook(({ url }) => useWaveform(url), {
      initialProps: { url: 'https://wave.sndcdn.com/test.json' as string | null },
    });
    await waitFor(() => expect(result.current.samples).toEqual([1, 2, 3]));

    rerender({ url: null });
    expect(result.current.samples).toBeNull();
  });
});
