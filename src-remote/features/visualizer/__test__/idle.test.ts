import { describe, expect, it } from 'vitest';
import { REMOTE_SPECTRUM_BAND_COUNT } from '@/lib/remote-protocol';
import { idleBands, mixBands, stepIdleMix } from '../renderers/idle';

describe('idleBands', () => {
  it('produces calm low levels', () => {
    const bands = idleBands(REMOTE_SPECTRUM_BAND_COUNT, 0);
    expect(bands).toHaveLength(REMOTE_SPECTRUM_BAND_COUNT);
    bands.forEach((value) => {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(0.25);
    });
  });

  it('moves over time', () => {
    expect(idleBands(REMOTE_SPECTRUM_BAND_COUNT, 0)).not.toEqual(idleBands(REMOTE_SPECTRUM_BAND_COUNT, 1000));
  });
});

describe('mixBands', () => {
  it('blends live and idle levels', () => {
    expect(mixBands([1, 1], [0, 0], 0)).toEqual([1, 1]);
    expect(mixBands([1, 1], [0, 0], 1)).toEqual([0, 0]);
    expect(mixBands([1, 1], [0, 0], 0.5)).toEqual([0.5, 0.5]);
  });

  it('treats missing live bands as silence', () => {
    expect(mixBands([], [0.2, 0.2], 0)).toEqual([0, 0]);
  });
});

describe('stepIdleMix', () => {
  it('eases toward the idle look and settles exactly', () => {
    const first = stepIdleMix(0, true);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    let mix = 0;
    for (let i = 0; i < 1000; i += 1) mix = stepIdleMix(mix, true);
    expect(mix).toBe(1);
  });

  it('eases back to live and settles exactly on zero', () => {
    let mix = 1;
    for (let i = 0; i < 1000; i += 1) mix = stepIdleMix(mix, false);
    expect(mix).toBe(0);
  });
});
