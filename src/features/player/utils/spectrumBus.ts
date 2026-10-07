export type SpectrumListener = (bands: number[]) => void;

const listeners = new Set<SpectrumListener>();

export function emitSpectrum(bands: number[]): void {
  listeners.forEach((listener) => listener(bands));
}

export function subscribeSpectrum(listener: SpectrumListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
