import { describe, expect, it, vi } from 'vitest';
import { emitSpectrum, subscribeSpectrum } from '../utils/spectrumBus';

describe('spectrumBus', () => {
  it('delivers bands to subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSpectrum(listener);
    emitSpectrum([0.5, 0.25]);
    expect(listener).toHaveBeenCalledWith([0.5, 0.25]);
    unsubscribe();
  });

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSpectrum(listener);
    unsubscribe();
    emitSpectrum([1]);
    expect(listener).not.toHaveBeenCalled();
  });
});
