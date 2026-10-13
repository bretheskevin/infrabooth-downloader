import { describe, expect, it } from 'vitest';
import { dominantHsl } from '../utils/artworkColor';

function pixels(rgba: [number, number, number, number], count = 4): Uint8ClampedArray {
  return new Uint8ClampedArray(Array.from({ length: count }, () => rgba).flat());
}

describe('dominantHsl', () => {
  it('reads a saturated color as HSL components', () => {
    expect(dominantHsl(pixels([255, 0, 0, 255]))).toBe('0 100% 50%');
    expect(dominantHsl(pixels([0, 0, 255, 255]))).toBe('240 100% 50%');
  });

  it('lifts dark colors so the glow stays visible', () => {
    expect(dominantHsl(pixels([80, 0, 0, 255]))).toBe('0 100% 45%');
  });

  it('returns null for grayscale, transparent or empty artwork', () => {
    expect(dominantHsl(pixels([128, 128, 128, 255]))).toBeNull();
    expect(dominantHsl(pixels([255, 0, 0, 0]))).toBeNull();
    expect(dominantHsl(new Uint8ClampedArray())).toBeNull();
  });
});
