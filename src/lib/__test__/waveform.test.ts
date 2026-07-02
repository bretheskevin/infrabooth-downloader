import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWaveformSamples } from '../waveform';

describe('fetchWaveformSamples', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and returns samples', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ samples: [1, 2, 3] }),
    } as Response);

    const signal = new AbortController().signal;
    const result = await fetchWaveformSamples('https://wave.sndcdn.com/test.json', signal);
    expect(result).toEqual([1, 2, 3]);
  });

  it('throws on non-ok HTTP response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const signal = new AbortController().signal;
    await expect(fetchWaveformSamples('https://wave.sndcdn.com/test.json', signal)).rejects.toThrow('HTTP 404');
  });

  it('propagates network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'));

    const signal = new AbortController().signal;
    await expect(fetchWaveformSamples('https://wave.sndcdn.com/test.json', signal)).rejects.toThrow('network error');
  });

  it('propagates AbortError', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    const signal = new AbortController().signal;
    await expect(fetchWaveformSamples('https://wave.sndcdn.com/test.json', signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
