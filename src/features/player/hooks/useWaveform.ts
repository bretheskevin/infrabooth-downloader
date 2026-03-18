import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface WaveformData {
  samples: number[];
}

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

    fetch(waveformUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<WaveformData>;
      })
      .then((data) => {
        setSamples(data.samples);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          void logger.warn(`Failed to fetch waveform: ${err.message}`);
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
