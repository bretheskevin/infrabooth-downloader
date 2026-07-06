import { useState, useEffect } from 'react';
import { fetchWaveformSamples } from '@/lib/waveform';

export function useWaveform(waveformUrl: string | null) {
  const [samples, setSamples] = useState<number[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!waveformUrl) {
      setSamples(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetchWaveformSamples(waveformUrl, controller.signal)
      .then((fetched) => {
        setSamples(fetched);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setSamples(null);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [waveformUrl]);

  return { samples, isLoading };
}
