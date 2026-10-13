import { describe, expect, it } from 'vitest';
import { REMOTE_SPECTRUM_BAND_COUNT } from '@/lib/remote-protocol';
import { decodeSpectrumFrame } from '@remote/lib/spectrumFrame';

describe('decodeSpectrumFrame', () => {
  it('maps each byte to a 0..1 level', () => {
    expect(decodeSpectrumFrame(new Uint8Array([0, 51, 255]).buffer)).toEqual([0, 0.2, 1]);
  });

  it('keeps one level per byte', () => {
    expect(decodeSpectrumFrame(new Uint8Array(REMOTE_SPECTRUM_BAND_COUNT).buffer)).toHaveLength(REMOTE_SPECTRUM_BAND_COUNT);
  });
});
