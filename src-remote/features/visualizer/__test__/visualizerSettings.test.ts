import { describe, expect, it } from 'vitest';
import { cycleStyle } from '../utils/visualizerSettings';

describe('cycleStyle', () => {
  it('moves forward and wraps', () => {
    expect(cycleStyle('bars', 1)).toBe('mirrored');
    expect(cycleStyle('wave', 1)).toBe('bars');
  });

  it('moves backward and wraps', () => {
    expect(cycleStyle('bars', -1)).toBe('wave');
  });
});
