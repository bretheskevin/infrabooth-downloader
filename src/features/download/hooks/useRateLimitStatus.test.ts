import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimitStatus } from './useRateLimitStatus';
import { useQueueStore } from '@/features/download/store';

describe('useRateLimitStatus', () => {
  beforeEach(() => {
    useQueueStore.setState({
      isRateLimited: false,
      rateLimitedAt: null,
    });
  });

  it('should return isRateLimited as false initially', () => {
    const { result } = renderHook(() => useRateLimitStatus());
    expect(result.current.isRateLimited).toBe(false);
  });

  it('should return rateLimitedAt as null initially', () => {
    const { result } = renderHook(() => useRateLimitStatus());
    expect(result.current.rateLimitedAt).toBeNull();
  });

  it('should reflect rate limited state from store', () => {
    const timestamp = Date.now();
    useQueueStore.setState({
      isRateLimited: true,
      rateLimitedAt: timestamp,
    });

    const { result } = renderHook(() => useRateLimitStatus());
    expect(result.current.isRateLimited).toBe(true);
    expect(result.current.rateLimitedAt).toBe(timestamp);
  });

  it('should update when store changes', () => {
    const { result } = renderHook(() => useRateLimitStatus());
    expect(result.current.isRateLimited).toBe(false);

    act(() => {
      useQueueStore.getState().setRateLimited(true);
    });

    expect(result.current.isRateLimited).toBe(true);
  });

  it('should clear when rate limit ends', () => {
    useQueueStore.setState({
      isRateLimited: true,
      rateLimitedAt: Date.now(),
    });

    const { result } = renderHook(() => useRateLimitStatus());
    expect(result.current.isRateLimited).toBe(true);

    act(() => {
      useQueueStore.getState().setRateLimited(false);
    });

    expect(result.current.isRateLimited).toBe(false);
    expect(result.current.rateLimitedAt).toBeNull();
  });
});
