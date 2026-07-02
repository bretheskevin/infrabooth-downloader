export interface WaveformData {
  samples: number[];
}

export async function fetchWaveformSamples(url: string, signal: AbortSignal): Promise<number[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as WaveformData;
  return data.samples;
}
