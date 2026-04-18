import { describe, it, expect } from 'vitest';
import { parseBackupTimestamp } from '../helpers';

describe('parseBackupTimestamp', () => {
  it('parses a standard backup directory name', () => {
    const date = parseBackupTimestamp('2026-04-17_143200_000');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(3); // April = 3
    expect(date.getUTCDate()).toBe(17);
    expect(date.getUTCHours()).toBe(14);
    expect(date.getUTCMinutes()).toBe(32);
    expect(date.getUTCSeconds()).toBe(0);
    expect(date.getUTCMilliseconds()).toBe(0);
  });

  it('parses a backup with collision suffix', () => {
    const date = parseBackupTimestamp('2026-04-17_143200_000_01');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCHours()).toBe(14);
  });

  it('parses milliseconds', () => {
    const date = parseBackupTimestamp('2026-01-05_091530_456');
    expect(date.getUTCHours()).toBe(9);
    expect(date.getUTCMinutes()).toBe(15);
    expect(date.getUTCSeconds()).toBe(30);
    expect(date.getUTCMilliseconds()).toBe(456);
  });

  it('returns Invalid Date for unparseable input', () => {
    const date = parseBackupTimestamp('not-a-timestamp');
    expect(isNaN(date.getTime())).toBe(true);
  });
});
