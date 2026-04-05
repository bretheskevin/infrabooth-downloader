import { describe, it, expect, vi } from 'vitest';
import { formatRelativeTime } from '../date';

const t = vi.fn((key: string, opts?: Record<string, unknown>) => {
  if (opts?.count !== undefined) return `${key}:${opts.count}`;
  return key;
});

describe('formatRelativeTime', () => {
  it('returns today for dates within the same day', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now, t)).toBe('common.today');
  });

  it('returns yesterday for dates 1 day ago', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(yesterday, t)).toBe('common.yesterday');
  });

  it('returns days ago for 2-6 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(threeDaysAgo, t);
    expect(t).toHaveBeenCalledWith('common.daysAgo', { count: 3 });
    expect(result).toBe('common.daysAgo:3');
  });

  it('returns weeks ago for 7-34 days', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twoWeeksAgo, t);
    expect(t).toHaveBeenCalledWith('common.weeksAgo', { count: 2 });
    expect(result).toBe('common.weeksAgo:2');
  });

  it('returns month ago for 35+ days', () => {
    const sixWeeksAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(sixWeeksAgo, t)).toBe('common.monthAgo');
  });

  it('returns weeks ago at exactly 7 days (boundary)', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(sevenDaysAgo, t);
    expect(t).toHaveBeenCalledWith('common.weeksAgo', { count: 1 });
    expect(result).toBe('common.weeksAgo:1');
  });

  it('returns month ago at exactly 35 days (boundary)', () => {
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(thirtyFiveDaysAgo, t)).toBe('common.monthAgo');
  });

  it('handles future dates gracefully', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(future, t)).toBe('common.today');
  });
});
