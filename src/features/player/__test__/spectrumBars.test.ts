import { describe, expect, it } from 'vitest';
import { isSettled, smoothTowards, withTaperedTail } from '../utils/spectrumBars';

describe('smoothTowards', () => {
  it('jumps straight to the target when the band count changes', () => {
    expect(smoothTowards([], [0.5, 0.25])).toEqual([0.5, 0.25]);
  });

  it('moves part of the way toward the target', () => {
    const [next] = smoothTowards([0], [1]);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it('snaps onto the target once close enough', () => {
    expect(smoothTowards([0.001], [0])).toEqual([0]);
  });
});

describe('isSettled', () => {
  it('is settled only when every value equals its target', () => {
    expect(isSettled([0.5, 0], [0.5, 0])).toBe(true);
    expect(isSettled([0.4, 0], [0.5, 0])).toBe(false);
    expect(isSettled([], [0.5])).toBe(false);
  });
});

describe('withTaperedTail', () => {
  it('appends bars that shrink from the last band toward zero', () => {
    const bars = withTaperedTail([0.2, 0.8], 3);
    expect(bars).toHaveLength(5);
    expect(bars.slice(0, 2)).toEqual([0.2, 0.8]);
    const tail = bars.slice(2);
    expect(tail[0]).toBeCloseTo(0.6);
    expect(tail[1]).toBeCloseTo(0.4);
    expect(tail[2]).toBeCloseTo(0.2);
  });

  it('draws nothing before the first frame arrives', () => {
    expect(withTaperedTail([], 3)).toEqual([]);
  });
});
