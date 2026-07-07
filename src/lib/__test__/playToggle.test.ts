import { describe, it, expect } from 'vitest';
import { resolvePlayToggle } from '../playToggle';

describe('resolvePlayToggle', () => {
  it('pauses when the current track is playing', () => {
    expect(resolvePlayToggle(true, true)).toBe('pause');
  });

  it('resumes when the current track is not playing', () => {
    expect(resolvePlayToggle(true, false)).toBe('resume');
  });

  it('plays when the track is not the current track', () => {
    expect(resolvePlayToggle(false, true)).toBe('play');
    expect(resolvePlayToggle(false, false)).toBe('play');
  });
});
