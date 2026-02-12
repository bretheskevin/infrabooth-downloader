import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Get the mocked listen function that was set up in setup-tauri.ts
const getMockedListen = async () => {
  const { listen } = await import('@tauri-apps/api/event');
  return listen as Mock;
};

describe('useAuthCallback', () => {
  const mockUnlisten = vi.fn();
  let mockListen: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockListen = await getMockedListen();
    mockListen.mockResolvedValue(mockUnlisten);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should setup listener on mount', async () => {
    const callback = vi.fn();
    const { useAuthCallback } = await import('../useAuthCallback');

    renderHook(() => useAuthCallback(callback));

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith('auth-callback', expect.any(Function));
    });
  });

  it('should call cleanup function on unmount', async () => {
    const callback = vi.fn();
    const { useAuthCallback } = await import('../useAuthCallback');

    const { unmount } = renderHook(() => useAuthCallback(callback));

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnlisten).toHaveBeenCalled();
  });

  it('should call callback with payload when event is received', async () => {
    const callback = vi.fn();
    let capturedHandler: ((event: { payload: string }) => void) | null = null;

    mockListen.mockImplementation((_event: string, handler: (event: { payload: string }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(mockUnlisten);
    });

    const { useAuthCallback } = await import('../useAuthCallback');
    renderHook(() => useAuthCallback(callback));

    await vi.waitFor(() => {
      expect(capturedHandler).not.toBeNull();
    });

    act(() => {
      capturedHandler?.({ payload: 'test-auth-code' });
    });

    expect(callback).toHaveBeenCalledWith('test-auth-code');
  });

  it('should not call callback if payload is empty', async () => {
    const callback = vi.fn();
    let capturedHandler: ((event: { payload: string }) => void) | null = null;

    mockListen.mockImplementation((_event: string, handler: (event: { payload: string }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(mockUnlisten);
    });

    const { useAuthCallback } = await import('../useAuthCallback');
    renderHook(() => useAuthCallback(callback));

    await vi.waitFor(() => {
      expect(capturedHandler).not.toBeNull();
    });

    act(() => {
      capturedHandler?.({ payload: '' });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not call callback after unmount', async () => {
    const callback = vi.fn();
    let capturedHandler: ((event: { payload: string }) => void) | null = null;

    mockListen.mockImplementation((_event: string, handler: (event: { payload: string }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(mockUnlisten);
    });

    const { useAuthCallback } = await import('../useAuthCallback');
    const { unmount } = renderHook(() => useAuthCallback(callback));

    await vi.waitFor(() => {
      expect(capturedHandler).not.toBeNull();
    });

    unmount();

    act(() => {
      capturedHandler?.({ payload: 'late-code' });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle listen error gracefully', async () => {
    const callback = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockListen.mockRejectedValue(new Error('Connection failed'));

    const { useAuthCallback } = await import('../useAuthCallback');
    renderHook(() => useAuthCallback(callback));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to setup auth-callback listener:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
