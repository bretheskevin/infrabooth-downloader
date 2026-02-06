import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStateListener } from './useAuthStateListener';
import { useAuthStore } from '@/stores/authStore';

// Mock Tauri event API
const mockUnlisten = vi.fn();
let eventListeners: Map<string, (event: { payload: unknown }) => void> = new Map();

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, callback: (event: { payload: unknown }) => void) => {
    eventListeners.set(eventName, callback);
    return Promise.resolve(mockUnlisten);
  }),
}));

describe('useAuthStateListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventListeners.clear();
    useAuthStore.setState({ isSignedIn: false, username: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should setup listener for auth-state-changed event', async () => {
    const { listen } = await import('@tauri-apps/api/event');

    renderHook(() => useAuthStateListener());

    expect(listen).toHaveBeenCalledWith('auth-state-changed', expect.any(Function));
  });

  it('should update auth store when auth-state-changed event is received', async () => {
    renderHook(() => useAuthStateListener());

    // Simulate receiving an auth-state-changed event
    const callback = eventListeners.get('auth-state-changed');
    expect(callback).toBeDefined();

    act(() => {
      callback!({
        payload: {
          isSignedIn: true,
          username: 'testuser',
        },
      });
    });

    expect(useAuthStore.getState().isSignedIn).toBe(true);
    expect(useAuthStore.getState().username).toBe('testuser');
  });

  it('should handle sign out event', async () => {
    // Start signed in
    useAuthStore.setState({ isSignedIn: true, username: 'testuser' });

    renderHook(() => useAuthStateListener());

    const callback = eventListeners.get('auth-state-changed');
    expect(callback).toBeDefined();

    act(() => {
      callback!({
        payload: {
          isSignedIn: false,
          username: null,
        },
      });
    });

    expect(useAuthStore.getState().isSignedIn).toBe(false);
    expect(useAuthStore.getState().username).toBeNull();
  });

  it('should cleanup listener on unmount', async () => {
    const { unmount } = renderHook(() => useAuthStateListener());

    // Wait for listener to be set up
    await vi.waitFor(() => {
      expect(eventListeners.has('auth-state-changed')).toBe(true);
    });

    unmount();

    // The unlisten function is called synchronously in cleanup
    expect(mockUnlisten).toHaveBeenCalled();
  });
});
