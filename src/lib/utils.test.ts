import { describe, it, expect } from 'vitest';
import { cn, formatDuration } from './utils';

describe('cn', () => {
  it('should merge tailwind classes', () => {
    expect(cn('p-4', 'text-red-500')).toBe('p-4 text-red-500');
  });

  it('should deduplicate conflicting classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});

describe('formatDuration', () => {
  it('should format zero milliseconds as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should format seconds only', () => {
    expect(formatDuration(45000)).toBe('0:45');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(185000)).toBe('3:05');
  });

  it('should format with single-digit seconds padded', () => {
    expect(formatDuration(60000)).toBe('1:00');
    expect(formatDuration(61000)).toBe('1:01');
  });

  it('should handle hour-length durations', () => {
    expect(formatDuration(3661000)).toBe('61:01');
  });

  it('should round down partial seconds', () => {
    expect(formatDuration(185999)).toBe('3:05');
  });
});
