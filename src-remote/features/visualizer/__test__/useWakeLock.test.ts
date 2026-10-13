import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWakeLock } from '../hooks/useWakeLock';

function installWakeLock() {
  const release = vi.fn(() => Promise.resolve());
  const request = vi.fn(() => Promise.resolve({ release }));
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, release };
}

describe('useWakeLock', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('is a no-op when the API is missing (insecure context)', () => {
    expect(() => renderHook(() => useWakeLock())).not.toThrow();
  });

  it('acquires a screen lock on mount and releases it on unmount', async () => {
    const { request, release } = installWakeLock();
    const { unmount } = renderHook(() => useWakeLock());
    await act(async () => {});
    expect(request).toHaveBeenCalledWith('screen');
    unmount();
    expect(release).toHaveBeenCalled();
  });

  it('re-acquires when the page becomes visible again', async () => {
    const { request } = installWakeLock();
    renderHook(() => useWakeLock());
    await act(async () => {});
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(request).toHaveBeenCalledTimes(2);
  });
});
