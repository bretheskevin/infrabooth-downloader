import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );

    expect(result.current).toBe('first');

    // Change value
    rerender({ value: 'second', delay: 300 });
    expect(result.current).toBe('first'); // Still the old value

    // Fast-forward time but not enough
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('first'); // Still the old value

    // Fast-forward past the delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('second'); // Now updated
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    // Rapid changes
    rerender({ value: 'b', delay: 300 });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'c', delay: 300 });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'd', delay: 300 });
    act(() => vi.advanceTimersByTime(100));

    // Should still have initial value because timer keeps resetting
    expect(result.current).toBe('a');

    // Wait full delay from last change
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('d');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('test');

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('updated');
  });

  it('should work with non-string values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { count: 1 }, delay: 300 } }
    );

    expect(result.current).toEqual({ count: 1 });

    rerender({ value: { count: 2 }, delay: 300 });
    act(() => vi.advanceTimersByTime(300));

    expect(result.current).toEqual({ count: 2 });
  });
});
