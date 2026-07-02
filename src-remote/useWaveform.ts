import { useState, useEffect } from 'react';
import { fetchWaveformSamples } from '@/lib/waveform';

export function useWaveform(waveformUrl: string | null) {
  const [samples, setSamples] = useState<number[] | null>(null);

  useEffect(() => {
    if (!waveformUrl) {
      setSamples(null);
      return;
    }

    const controller = new AbortController();

    fetchWaveformSamples(waveformUrl, controller.signal)
      .then((fetched) => {
        setSamples(fetched);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setSamples(null);
        }
      });

    return () => {
      controller.abort();
    };
  }, [waveformUrl]);

  return { samples };
}
