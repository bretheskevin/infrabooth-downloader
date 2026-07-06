import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWaveform } from '@/lib/useWaveform';

describe('useWaveform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null samples when no URL provided', () => {
    const { result } = renderHook(() => useWaveform(null));
    expect(result.current.samples).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches and parses waveform data', async () => {
    const mockSamples = Array.from({ length: 100 }, (_, i) => i / 100);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ samples: mockSamples }),
    });

    const { result } = renderHook(() => useWaveform('https://wis.sndcdn.com/test'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.samples).toEqual(mockSamples);
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useWaveform('https://wis.sndcdn.com/notfound'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.samples).toBeNull();
  });

  it('aborts fetch on unmount', async () => {
    const abortSpy = vi.fn();
    global.fetch = vi.fn().mockImplementation((_url, opts) => {
      opts?.signal?.addEventListener('abort', abortSpy);
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useWaveform('https://wis.sndcdn.com/test'));
    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });
});
