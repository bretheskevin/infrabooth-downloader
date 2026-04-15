import { describe, it, expect, vi } from 'vitest';
import { makeSetter, makeClampedSetter, pickKeys } from '../helpers';

interface TestState {
  name: string;
  count: number;
  enabled: boolean;
}

describe('makeSetter', () => {
  it('calls set with { key: value }', () => {
    const set = vi.fn();
    const setName = makeSetter<TestState, 'name'>('name', set);

    setName('alice');

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ name: 'alice' });
  });

  it('passes value through untouched', () => {
    const set = vi.fn();
    const setEnabled = makeSetter<TestState, 'enabled'>('enabled', set);

    setEnabled(false);

    expect(set).toHaveBeenCalledWith({ enabled: false });
  });

  it('returns a new function per factory invocation', () => {
    const set = vi.fn();
    const a = makeSetter<TestState, 'name'>('name', set);
    const b = makeSetter<TestState, 'name'>('name', set);

    expect(a).not.toBe(b);
  });
});

describe('makeClampedSetter', () => {
  it('passes in-range values through unchanged', () => {
    const set = vi.fn();
    const setCount = makeClampedSetter<TestState, 'count'>('count', set, 1, 10);

    setCount(5);

    expect(set).toHaveBeenCalledWith({ count: 5 });
  });

  it('clamps below the minimum', () => {
    const set = vi.fn();
    const setCount = makeClampedSetter<TestState, 'count'>('count', set, 1, 10);

    setCount(-3);

    expect(set).toHaveBeenCalledWith({ count: 1 });
  });

  it('clamps above the maximum', () => {
    const set = vi.fn();
    const setCount = makeClampedSetter<TestState, 'count'>('count', set, 1, 10);

    setCount(999);

    expect(set).toHaveBeenCalledWith({ count: 10 });
  });

  it('respects fractional bounds', () => {
    const set = vi.fn();
    const setCount = makeClampedSetter<TestState, 'count'>('count', set, 0, 1);

    setCount(0.5);
    setCount(2);
    setCount(-1);

    expect(set).toHaveBeenNthCalledWith(1, { count: 0.5 });
    expect(set).toHaveBeenNthCalledWith(2, { count: 1 });
    expect(set).toHaveBeenNthCalledWith(3, { count: 0 });
  });
});

describe('pickKeys', () => {
  it('returns only the requested keys', () => {
    const source = { a: 1, b: 2, c: 3 };
    const result = pickKeys(source, ['a', 'c'] as const);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('preserves value types (including falsy)', () => {
    const source = { name: '', count: 0, enabled: false };
    const result = pickKeys(source, ['name', 'count', 'enabled'] as const);

    expect(result).toEqual({ name: '', count: 0, enabled: false });
  });

  it('returns empty object when no keys given', () => {
    const source = { a: 1, b: 2 };
    const result = pickKeys(source, [] as const);

    expect(result).toEqual({});
  });

  it('does not include keys absent from the list', () => {
    const source = { a: 1, b: 2, c: 3 };
    const result = pickKeys(source, ['a'] as const);

    expect(result).not.toHaveProperty('b');
    expect(result).not.toHaveProperty('c');
  });
});
