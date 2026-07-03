import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '@remote/hooks/useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null toastElement initially', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toastElement).toBeNull();
  });

  it('returns a non-null toastElement after showToast is called', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast('Added to queue');
    });
    expect(result.current.toastElement).not.toBeNull();
  });

  it('clears the toastElement after 2000ms', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast('Added to queue');
    });
    expect(result.current.toastElement).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.toastElement).toBeNull();
  });

  it('replaces an in-flight toast with a new one', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.showToast('First');
    });
    act(() => {
      result.current.showToast('Second');
    });
    expect(result.current.toastElement).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.toastElement).toBeNull();
  });
});
