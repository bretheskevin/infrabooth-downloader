import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { AUTO_HIDE_MS, useAutoHide } from '../hooks/useAutoHide';

describe('useAutoHide', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts hidden', () => {
    const { result } = renderHook(() => useAutoHide());
    expect(result.current.visible).toBe(false);
  });

  it('hides again after the delay', () => {
    const { result } = renderHook(() => useAutoHide());
    act(() => result.current.reveal());
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(AUTO_HIDE_MS);
    });
    expect(result.current.visible).toBe(false);
  });

  it('restarts the timer on every interaction', () => {
    const { result } = renderHook(() => useAutoHide());
    act(() => result.current.reveal());
    act(() => {
      vi.advanceTimersByTime(AUTO_HIDE_MS - 1000);
    });
    act(() => result.current.reveal());
    act(() => {
      vi.advanceTimersByTime(AUTO_HIDE_MS - 1000);
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.visible).toBe(false);
  });

  it('toggles between shown and hidden', () => {
    const { result } = renderHook(() => useAutoHide());
    act(() => result.current.toggle());
    expect(result.current.visible).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.visible).toBe(false);
  });

  it('clears its timer on unmount', () => {
    const { result, unmount } = renderHook(() => useAutoHide());
    act(() => result.current.reveal());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
