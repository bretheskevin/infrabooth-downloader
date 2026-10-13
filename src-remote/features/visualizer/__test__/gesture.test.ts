import { describe, expect, it } from 'vitest';
import { classifyGesture } from '../utils/gesture';

describe('classifyGesture', () => {
  it('treats a small movement as a tap', () => {
    expect(classifyGesture(3, -4)).toBe('tap');
  });

  it('maps a left swipe to the next style', () => {
    expect(classifyGesture(-120, 10)).toBe('next');
  });

  it('maps a right swipe to the previous style', () => {
    expect(classifyGesture(120, -10)).toBe('previous');
  });

  it('ignores mostly vertical drags', () => {
    expect(classifyGesture(60, 200)).toBeNull();
  });

  it('ignores short horizontal drags', () => {
    expect(classifyGesture(30, 0)).toBeNull();
  });
});
